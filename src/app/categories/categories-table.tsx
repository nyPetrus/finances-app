"use client";

import { useState, useTransition } from "react";
import { TagIcon, Trash2Icon, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableTableHead } from "@/components/sortable-table-head";
import { ColumnsMenu } from "@/components/columns-menu";
import { ColumnHeaderIcon } from "@/components/column-header-icon";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { IconSwatchPicker } from "@/components/icon-swatch-picker";
import { CategoryIcon } from "@/components/category-icon";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useColumnPreferences } from "@/hooks/use-column-preferences";
import type { Category } from "@/lib/supabase/types";
import { deleteCategories, updateCategory } from "./actions";
import { AddCategoryDialog } from "./add-category-dialog";
import { type SortKey } from "./sort";

const kindLabels: Record<Category["kind"], string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

const COLUMNS: {
  key: SortKey;
  label: string;
  cellClassName?: string;
  headerIcon?: LucideIcon;
  headerIconOnly?: boolean;
}[] = [
  { key: "name", label: "Name", cellClassName: "font-medium", headerIcon: TagIcon },
  { key: "type", label: "Type" },
];

const DEFAULT_COLUMN_ORDER = COLUMNS.map((column) => column.key);

function renderCell(category: Category, key: SortKey) {
  switch (key) {
    case "name":
      return (
        <div className="flex items-center gap-2">
          <CategoryIcon icon={category.icon} className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{category.name}</span>
        </div>
      );
    case "type":
      return <Badge variant="secondary">{kindLabels[category.kind]}</Badge>;
  }
}

export function CategoriesTable({
  categories,
  sortKey,
  sortDir,
}: {
  categories: Category[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
}) {
  const [isDeleting, startDelete] = useTransition();
  const [isSavingEdit, startSaveEdit] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editIcon, setEditIcon] = useState("");
  const { hidden: hiddenColumns, order: columnOrder, toggle: toggleColumn, move: moveColumn } =
    useColumnPreferences<SortKey>("categories-table", DEFAULT_COLUMN_ORDER);

  function sortHref(column: SortKey) {
    const nextDir: "asc" | "desc" = sortKey === column && sortDir === "asc" ? "desc" : "asc";
    return `/categories?${new URLSearchParams({ sort: column, dir: nextDir }).toString()}`;
  }

  const {
    selected,
    allSelected,
    someSelected,
    toggleAll,
    toggleOne,
    clear: clearSelection,
  } = useRowSelection(categories, (category) => category.id);

  function openEditDialog(category: Category) {
    setActionError(null);
    setEditIcon(category.icon);
    setEditingCategory(category);
  }

  function handleDelete() {
    if (selected.size === 0) return;
    const label = selected.size === 1 ? "this category" : `these ${selected.size} categories`;
    if (!window.confirm(`Delete ${label}? Transactions in ${selected.size === 1 ? "it" : "them"} will become uncategorized.`)) {
      return;
    }
    setActionError(null);
    startDelete(async () => {
      try {
        await deleteCategories(Array.from(selected));
        clearSelection();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to delete.");
      }
    });
  }

  function handleDeleteRow(category: Category) {
    if (!window.confirm(`Delete this category? Transactions in it will become uncategorized.`)) {
      return;
    }
    setActionError(null);
    startDelete(async () => {
      try {
        await deleteCategories([category.id]);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to delete.");
      }
    });
  }

  const columnsByKey = new Map(COLUMNS.map((column) => [column.key, column]));
  const visibleColumns = columnOrder
    .map((key) => columnsByKey.get(key)!)
    .filter((column) => !hiddenColumns.has(column.key));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ColumnsMenu columns={COLUMNS} order={columnOrder} hidden={hiddenColumns} onToggle={toggleColumn} onMove={moveColumn} />
          <AddCategoryDialog />
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={selected.size === 0 || isDeleting}
            onClick={handleDelete}
            aria-label="Delete"
            title="Delete"
          >
            <Trash2Icon />
          </Button>
        </div>
        {selected.size > 0 && (
          <span className="ml-auto text-sm text-muted-foreground">{selected.size} selected</span>
        )}
      </div>
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-0">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all categories"
                />
              </TableHead>
              <TableHead className="w-0" />
              {visibleColumns.map((column) => (
                <SortableTableHead key={column.key} href={sortHref(column.key)} active={sortKey === column.key} dir={sortDir}>
                  {column.headerIcon ? (
                    <ColumnHeaderIcon icon={column.headerIcon} label={column.label} iconOnly={column.headerIconOnly} />
                  ) : (
                    column.label
                  )}
                </SortableTableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id} className="group">
                <TableCell>
                  <Checkbox
                    checked={selected.has(category.id)}
                    onCheckedChange={() => toggleOne(category.id)}
                    aria-label={`Select ${category.name}`}
                    className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[checked]:opacity-100"
                  />
                </TableCell>
                <TableCell>
                  <RowActionsMenu
                    onEdit={() => openEditDialog(category)}
                    onDelete={() => handleDeleteRow(category)}
                    disabled={isDeleting}
                  />
                </TableCell>
                {visibleColumns.map((column) => (
                  <TableCell key={column.key} className={column.cellClassName}>
                    {renderCell(category, column.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {editingCategory && (
        <Dialog open={editingCategory !== null} onOpenChange={(open) => !open && setEditingCategory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit category</DialogTitle>
            </DialogHeader>
            <form
              id={`edit-category-${editingCategory.id}`}
              action={(formData) => {
                setActionError(null);
                startSaveEdit(async () => {
                  try {
                    await updateCategory(formData);
                    setEditingCategory(null);
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : "Failed to update category.");
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="id" value={editingCategory.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={editingCategory.name} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="kind">Type</Label>
                <Select name="kind" defaultValue={editingCategory.kind}>
                  <SelectTrigger id="kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Icon</Label>
                <IconSwatchPicker name="icon" value={editIcon} onChange={setEditIcon} />
              </div>
              <DialogFooter>
                <Button type="submit" form={`edit-category-${editingCategory.id}`} disabled={isSavingEdit}>
                  {isSavingEdit ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
