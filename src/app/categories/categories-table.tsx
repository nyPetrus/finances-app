"use client";

import { useState, useTransition } from "react";
import { ArchiveIcon, ArchiveRestoreIcon, TagIcon, Trash2Icon, type LucideIcon } from "lucide-react";
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
import { useInactiveFilter } from "@/hooks/use-inactive-filter";
import type { Category } from "@/lib/supabase/types";
import { deleteCategories, setCategoriesActive, updateCategory } from "./actions";
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
  { key: "name", label: "Name", cellClassName: "max-w-72 font-medium", headerIcon: TagIcon },
  { key: "type", label: "Type" },
];

const DEFAULT_COLUMN_ORDER = COLUMNS.map((column) => column.key);

function renderCell(category: Category, key: SortKey) {
  switch (key) {
    case "name":
      return (
        <div className="flex items-center gap-2">
          <CategoryIcon icon={category.icon} className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">{category.name}</span>
          {!category.is_active && <Badge variant="outline">Inactive</Badge>}
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
  const [isTogglingActive, startToggleActive] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  // Categories a delete skipped because they're in use, offered a one-click
  // "Deactivate instead" next to the error.
  const [inUseIds, setInUseIds] = useState<string[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editIcon, setEditIcon] = useState("");
  const { hidden: hiddenColumns, order: columnOrder, toggle: toggleColumn, move: moveColumn } =
    useColumnPreferences<SortKey>("categories-table", DEFAULT_COLUMN_ORDER);
  const {
    showInactive,
    setShowInactive,
    inactiveCount,
    visibleRows: visibleCategories,
  } = useInactiveFilter(categories);

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
  } = useRowSelection(visibleCategories, (category) => category.id);

  const selectedCategories = visibleCategories.filter((category) => selected.has(category.id));
  const isBusy = isDeleting || isTogglingActive;

  function runDelete(ids: string[]) {
    setActionError(null);
    setInUseIds([]);
    startDelete(async () => {
      try {
        const result = await deleteCategories(ids);
        clearSelection();
        setActionError(result.error);
        setInUseIds(result.inUseIds);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to delete.");
      }
    });
  }

  function setActive(ids: string[], isActive: boolean) {
    setActionError(null);
    setInUseIds([]);
    startToggleActive(async () => {
      try {
        await setCategoriesActive(ids, isActive);
        clearSelection();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  }

  function openEditDialog(category: Category) {
    setActionError(null);
    setEditIcon(category.icon);
    setEditingCategory(category);
  }

  function handleDelete() {
    if (selected.size === 0) return;
    const label = selected.size === 1 ? "this category" : `these ${selected.size} categories`;
    if (!window.confirm(`Delete ${label}? Categories still in use will be skipped.`)) return;
    runDelete(Array.from(selected));
  }

  function handleDeleteRow(category: Category) {
    if (!window.confirm(`Delete this category?`)) return;
    runDelete([category.id]);
  }

  const columnsByKey = new Map(COLUMNS.map((column) => [column.key, column]));
  const visibleColumns = columnOrder
    .map((key) => columnsByKey.get(key)!)
    .filter((column) => !hiddenColumns.has(column.key));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          ) : (
            <AddCategoryDialog />
          )}
          {selectedCategories.some((category) => category.is_active) && (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isBusy}
              onClick={() => setActive(Array.from(selected), false)}
              aria-label="Deactivate"
              title="Deactivate"
            >
              <ArchiveIcon />
            </Button>
          )}
          {selectedCategories.some((category) => !category.is_active) && (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isBusy}
              onClick={() => setActive(Array.from(selected), true)}
              aria-label="Activate"
              title="Activate"
            >
              <ArchiveRestoreIcon />
            </Button>
          )}
          {selected.size > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isBusy}
              onClick={handleDelete}
              aria-label="Delete"
              title="Delete"
            >
              <Trash2Icon />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {inactiveCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowInactive(!showInactive)}>
              {showInactive ? "Hide inactive" : `Show inactive (${inactiveCount})`}
            </Button>
          )}
          <ColumnsMenu columns={COLUMNS} order={columnOrder} hidden={hiddenColumns} onToggle={toggleColumn} onMove={moveColumn} />
        </div>
      </div>
      {actionError && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-destructive">{actionError}</p>
          {inUseIds.length > 0 && (
            <Button variant="outline" size="sm" disabled={isBusy} onClick={() => setActive(inUseIds, false)}>
              Deactivate instead
            </Button>
          )}
        </div>
      )}

      {visibleCategories.length === 0 ? (
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
            {visibleCategories.map((category) => (
              <TableRow key={category.id} className={category.is_active ? "group" : "group text-muted-foreground"}>
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
                    onToggleActive={() => setActive([category.id], !category.is_active)}
                    isActive={category.is_active}
                    disabled={isBusy}
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
