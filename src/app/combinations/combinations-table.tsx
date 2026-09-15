"use client";

import { useState, useTransition } from "react";
import { TagIcon, TagsIcon, Trash2Icon, type LucideIcon } from "lucide-react";
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
import { CategoryIcon } from "@/components/category-icon";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useColumnPreferences } from "@/hooks/use-column-preferences";
import type { Category, Class } from "@/lib/supabase/types";
import { deleteClasses, updateClass } from "@/app/classes/actions";
import { AddClassDialog } from "@/app/classes/add-class-dialog";
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
  { key: "type", label: "Type" },
  { key: "category", label: "Category", headerIcon: TagIcon },
  { key: "class", label: "Class", cellClassName: "font-medium", headerIcon: TagsIcon },
];

const DEFAULT_COLUMN_ORDER = COLUMNS.map((column) => column.key);

// A "combination" row is just a Class displayed with its parent Category's
// kind as an extra derived Type column — Add/Edit/Delete all operate on the
// underlying Class via the same actions/dialog the Classes page uses.
export function CombinationsTable({
  classes,
  categories,
  sortKey,
  sortDir,
}: {
  classes: Class[];
  categories: Category[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
}) {
  const [isDeleting, startDelete] = useTransition();
  const [isSavingEdit, startSaveEdit] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const { hidden: hiddenColumns, order: columnOrder, toggle: toggleColumn, move: moveColumn } =
    useColumnPreferences<SortKey>("combinations-table", DEFAULT_COLUMN_ORDER);

  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  function sortHref(column: SortKey) {
    const nextDir: "asc" | "desc" = sortKey === column && sortDir === "asc" ? "desc" : "asc";
    return `/combinations?${new URLSearchParams({ sort: column, dir: nextDir }).toString()}`;
  }

  function renderCell(classItem: Class, key: SortKey) {
    const category = categoriesById.get(classItem.category_id);
    switch (key) {
      case "type":
        return category ? (
          <Badge variant="secondary">{kindLabels[category.kind]}</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      case "category":
        return category ? (
          <div className="flex items-center gap-2">
            <CategoryIcon icon={category.icon} className="size-4 shrink-0 text-muted-foreground" />
            <span>{category.name}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      case "class":
        return classItem.name;
    }
  }

  const {
    selected,
    allSelected,
    someSelected,
    toggleAll,
    toggleOne,
    clear: clearSelection,
  } = useRowSelection(classes, (classItem) => classItem.id);

  function handleDelete() {
    if (selected.size === 0) return;
    const label = selected.size === 1 ? "this combination" : `these ${selected.size} combinations`;
    if (!window.confirm(`Delete ${label}?`)) return;
    setActionError(null);
    startDelete(async () => {
      try {
        await deleteClasses(Array.from(selected));
        clearSelection();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to delete.");
      }
    });
  }

  function handleDeleteRow(classItem: Class) {
    if (!window.confirm(`Delete this combination?`)) return;
    setActionError(null);
    startDelete(async () => {
      try {
        await deleteClasses([classItem.id]);
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
          {selected.size > 0 ? (
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          ) : (
            <AddClassDialog categories={categories} />
          )}
          {selected.size > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isDeleting}
              onClick={handleDelete}
              aria-label="Delete"
              title="Delete"
            >
              <Trash2Icon />
            </Button>
          )}
        </div>
        <ColumnsMenu columns={COLUMNS} order={columnOrder} hidden={hiddenColumns} onToggle={toggleColumn} onMove={moveColumn} />
      </div>
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {classes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No combinations yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-0">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all combinations"
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
            {classes.map((classItem) => (
              <TableRow key={classItem.id} className="group">
                <TableCell>
                  <Checkbox
                    checked={selected.has(classItem.id)}
                    onCheckedChange={() => toggleOne(classItem.id)}
                    aria-label={`Select ${classItem.name}`}
                    className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[checked]:opacity-100"
                  />
                </TableCell>
                <TableCell>
                  <RowActionsMenu
                    onEdit={() => setEditingClass(classItem)}
                    onDelete={() => handleDeleteRow(classItem)}
                    disabled={isDeleting}
                  />
                </TableCell>
                {visibleColumns.map((column) => (
                  <TableCell key={column.key} className={column.cellClassName}>
                    {renderCell(classItem, column.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {editingClass && (
        <Dialog open={editingClass !== null} onOpenChange={(open) => !open && setEditingClass(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit combination</DialogTitle>
            </DialogHeader>
            <form
              id={`edit-combination-${editingClass.id}`}
              action={(formData) => {
                setActionError(null);
                startSaveEdit(async () => {
                  try {
                    await updateClass(formData);
                    setEditingClass(null);
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : "Failed to update combination.");
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="id" value={editingClass.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Class</Label>
                <Input id="name" name="name" defaultValue={editingClass.name} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="category_id">Category</Label>
                <Select name="category_id" defaultValue={editingClass.category_id}>
                  <SelectTrigger id="category_id">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" form={`edit-combination-${editingClass.id}`} disabled={isSavingEdit}>
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
