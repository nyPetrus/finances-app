"use client";

import { useState, useTransition } from "react";
import { PencilIcon } from "lucide-react";
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
import { ColorSwatchPicker } from "@/components/color-swatch-picker";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useColumnPreferences } from "@/hooks/use-column-preferences";
import type { Category } from "@/lib/supabase/types";
import { deleteCategories, updateCategory } from "./actions";
import { type SortKey } from "./sort";

const kindLabels: Record<Category["kind"], string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

const COLUMNS: { key: SortKey; label: string; cellClassName?: string }[] = [
  { key: "name", label: "Name", cellClassName: "font-medium" },
  { key: "type", label: "Type" },
];

const DEFAULT_COLUMN_ORDER = COLUMNS.map((column) => column.key);

function renderCell(category: Category, key: SortKey) {
  switch (key) {
    case "name":
      return (
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editColor, setEditColor] = useState("");
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
    soleSelectedRow: soleSelectedCategory,
  } = useRowSelection(categories, (category) => category.id);

  function openEditDialog() {
    if (!soleSelectedCategory) return;
    setActionError(null);
    setEditColor(soleSelectedCategory.color);
    setEditDialogOpen(true);
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

  if (categories.length === 0) {
    return <p className="text-sm text-muted-foreground">No categories yet.</p>;
  }

  const columnsByKey = new Map(COLUMNS.map((column) => [column.key, column]));
  const visibleColumns = columnOrder
    .map((key) => columnsByKey.get(key)!)
    .filter((column) => !hiddenColumns.has(column.key));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        {selected.size > 0 && (
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ColumnsMenu columns={COLUMNS} order={columnOrder} hidden={hiddenColumns} onToggle={toggleColumn} onMove={moveColumn} />
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!soleSelectedCategory}
            onClick={openEditDialog}
            aria-label="Edit"
            title="Edit"
          >
            <PencilIcon />
          </Button>
          <Button variant="ghost" size="sm" disabled={selected.size === 0 || isDeleting} onClick={handleDelete}>
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

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
            {visibleColumns.map((column) => (
              <SortableTableHead key={column.key} href={sortHref(column.key)} active={sortKey === column.key} dir={sortDir}>
                {column.label}
              </SortableTableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell>
                <Checkbox
                  checked={selected.has(category.id)}
                  onCheckedChange={() => toggleOne(category.id)}
                  aria-label={`Select ${category.name}`}
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

      {soleSelectedCategory && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit category</DialogTitle>
            </DialogHeader>
            <form
              id={`edit-category-${soleSelectedCategory.id}`}
              action={(formData) => {
                setActionError(null);
                startSaveEdit(async () => {
                  try {
                    await updateCategory(formData);
                    setEditDialogOpen(false);
                    clearSelection();
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : "Failed to update category.");
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="id" value={soleSelectedCategory.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={soleSelectedCategory.name} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="kind">Type</Label>
                <Select name="kind" defaultValue={soleSelectedCategory.kind}>
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
                <Label>Color</Label>
                <ColorSwatchPicker name="color" value={editColor} onChange={setEditColor} />
              </div>
              <DialogFooter>
                <Button type="submit" form={`edit-category-${soleSelectedCategory.id}`} disabled={isSavingEdit}>
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
