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
import { useRowSelection } from "@/hooks/use-row-selection";
import { useColumnPreferences } from "@/hooks/use-column-preferences";
import type { Category, Class } from "@/lib/supabase/types";
import { deleteClasses, updateClass } from "./actions";
import { type SortKey } from "./sort";

const COLUMNS: { key: SortKey; label: string; cellClassName?: string }[] = [
  { key: "name", label: "Name", cellClassName: "font-medium" },
  { key: "category", label: "Category" },
];

const DEFAULT_COLUMN_ORDER = COLUMNS.map((column) => column.key);

export function ClassesTable({
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { hidden: hiddenColumns, order: columnOrder, toggle: toggleColumn, move: moveColumn } =
    useColumnPreferences<SortKey>("classes-table", DEFAULT_COLUMN_ORDER);

  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  function sortHref(column: SortKey) {
    const nextDir: "asc" | "desc" = sortKey === column && sortDir === "asc" ? "desc" : "asc";
    return `/classes?${new URLSearchParams({ sort: column, dir: nextDir }).toString()}`;
  }

  function renderCell(classItem: Class, key: SortKey) {
    switch (key) {
      case "name":
        return classItem.name;
      case "category": {
        const category = categoriesById.get(classItem.category_id);
        return category ? (
          <Badge
            variant="secondary"
            className="max-w-full truncate"
            style={{ backgroundColor: `${category.color}22`, color: category.color }}
          >
            {category.name}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      }
    }
  }

  const {
    selected,
    allSelected,
    someSelected,
    toggleAll,
    toggleOne,
    clear: clearSelection,
    soleSelectedRow: soleSelectedClass,
  } = useRowSelection(classes, (classItem) => classItem.id);

  function handleDelete() {
    if (selected.size === 0) return;
    const label = selected.size === 1 ? "this class" : `these ${selected.size} classes`;
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

  if (classes.length === 0) {
    return <p className="text-sm text-muted-foreground">No classes yet.</p>;
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
            disabled={!soleSelectedClass}
            onClick={() => setEditDialogOpen(true)}
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
                aria-label="Select all classes"
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
          {classes.map((classItem) => (
            <TableRow key={classItem.id}>
              <TableCell>
                <Checkbox
                  checked={selected.has(classItem.id)}
                  onCheckedChange={() => toggleOne(classItem.id)}
                  aria-label={`Select ${classItem.name}`}
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

      {soleSelectedClass && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit class</DialogTitle>
            </DialogHeader>
            <form
              id={`edit-class-${soleSelectedClass.id}`}
              action={(formData) => {
                setActionError(null);
                startSaveEdit(async () => {
                  try {
                    await updateClass(formData);
                    setEditDialogOpen(false);
                    clearSelection();
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : "Failed to update class.");
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="id" value={soleSelectedClass.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={soleSelectedClass.name} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="category_id">Category</Label>
                <Select name="category_id" defaultValue={soleSelectedClass.category_id}>
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
                <Button type="submit" form={`edit-class-${soleSelectedClass.id}`} disabled={isSavingEdit}>
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
