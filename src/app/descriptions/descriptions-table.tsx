"use client";

import { useState, useTransition } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";
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
import { CategoryIcon } from "@/components/category-icon";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useColumnPreferences } from "@/hooks/use-column-preferences";
import type { Category, Class, MappedDescription } from "@/lib/supabase/types";
import { deleteMappedDescriptions, updateMappedDescription } from "./actions";
import { AddMappingDialog } from "./add-mapping-dialog";
import { type SortKey } from "./sort";

const checkTypeLabels: Record<MappedDescription["check_type"], string> = {
  equal_to: "Equal to",
  starts_with: "Starts with",
  contains: "Contains",
};

const COLUMNS: { key: SortKey; label: string; align?: "center"; cellClassName?: string }[] = [
  { key: "description", label: "Description", cellClassName: "truncate" },
  { key: "check_type", label: "Operator" },
  { key: "category", label: "Category", align: "center", cellClassName: "text-center" },
  { key: "class", label: "Class", cellClassName: "truncate" },
];

const DEFAULT_COLUMN_ORDER = COLUMNS.map((column) => column.key);

export function DescriptionsTable({
  mappings,
  categories,
  classes,
  sortKey,
  sortDir,
}: {
  mappings: MappedDescription[];
  categories: Category[];
  classes: Class[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
}) {
  const [isDeleting, startDelete] = useTransition();
  const [isSavingEdit, startSaveEdit] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editClassId, setEditClassId] = useState<string | null>(null);
  const { hidden: hiddenColumns, order: columnOrder, toggle: toggleColumn, move: moveColumn } =
    useColumnPreferences<SortKey>("descriptions-table", DEFAULT_COLUMN_ORDER);

  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const classesById = new Map(classes.map((c) => [c.id, c]));
  const editClassesForCategory = editCategoryId
    ? classes.filter((c) => c.category_id === editCategoryId)
    : [];

  function sortHref(column: SortKey) {
    const nextDir: "asc" | "desc" = sortKey === column && sortDir === "asc" ? "desc" : "asc";
    return `/descriptions?${new URLSearchParams({ sort: column, dir: nextDir }).toString()}`;
  }

  function renderCell(mapping: MappedDescription, key: SortKey) {
    switch (key) {
      case "description":
        return <span title={mapping.description}>{mapping.description}</span>;
      case "check_type":
        return <Badge variant="secondary">{checkTypeLabels[mapping.check_type]}</Badge>;
      case "category": {
        const category = categoriesById.get(mapping.category_id);
        return category ? (
          <span title={category.name} className="inline-flex">
            <CategoryIcon icon={category.icon} className="size-4" />
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      }
      case "class": {
        const classItem = mapping.class_id ? classesById.get(mapping.class_id) : null;
        return classItem?.name ?? <span className="text-sm text-muted-foreground">—</span>;
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
    soleSelectedRow: soleSelectedMapping,
  } = useRowSelection(mappings, (mapping) => mapping.description);

  function openEditDialog() {
    if (!soleSelectedMapping) return;
    setActionError(null);
    setEditCategoryId(soleSelectedMapping.category_id);
    setEditClassId(soleSelectedMapping.class_id);
    setEditDialogOpen(true);
  }

  function handleDelete() {
    if (selected.size === 0) return;
    const label = selected.size === 1 ? "this mapping" : `these ${selected.size} mappings`;
    if (!window.confirm(`Delete ${label}?`)) return;
    setActionError(null);
    startDelete(async () => {
      try {
        await deleteMappedDescriptions(Array.from(selected));
        clearSelection();
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
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!soleSelectedMapping}
            onClick={openEditDialog}
            aria-label="Edit"
            title="Edit"
          >
            <PencilIcon />
          </Button>
          <AddMappingDialog categories={categories} classes={classes} />
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

      {mappings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No mapped descriptions yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-0">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all mappings"
                />
              </TableHead>
              {visibleColumns.map((column) => (
                <SortableTableHead key={column.key} href={sortHref(column.key)} active={sortKey === column.key} dir={sortDir} align={column.align}>
                  {column.label}
                </SortableTableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((mapping) => (
              <TableRow key={mapping.description} className="group">
                <TableCell>
                  <Checkbox
                    checked={selected.has(mapping.description)}
                    onCheckedChange={() => toggleOne(mapping.description)}
                    aria-label={`Select mapping for ${mapping.description}`}
                    className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[checked]:opacity-100"
                  />
                </TableCell>
                {visibleColumns.map((column) => (
                  <TableCell key={column.key} className={column.cellClassName}>
                    {renderCell(mapping, column.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {soleSelectedMapping && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit mapping</DialogTitle>
            </DialogHeader>
            <form
              id={`edit-mapping-${soleSelectedMapping.description}`}
              action={(formData) => {
                setActionError(null);
                startSaveEdit(async () => {
                  try {
                    await updateMappedDescription(formData);
                    setEditDialogOpen(false);
                    clearSelection();
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : "Failed to update mapping.");
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="original_description" value={soleSelectedMapping.description} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={soleSelectedMapping.description}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="check_type">Operator</Label>
                <Select name="check_type" defaultValue={soleSelectedMapping.check_type}>
                  <SelectTrigger id="check_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal_to">Equal to</SelectItem>
                    <SelectItem value="starts_with">Starts with</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="category_id">Category</Label>
                <Select
                  name="category_id"
                  value={editCategoryId}
                  onValueChange={(value) => {
                    setEditCategoryId(value);
                    setEditClassId(null);
                  }}
                >
                  <SelectTrigger id="category_id">
                    <SelectValue placeholder="Select a category" />
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
              <div className="flex flex-col gap-2">
                <Label htmlFor="class_id">Class</Label>
                <Select
                  name="class_id"
                  value={editClassId}
                  onValueChange={setEditClassId}
                  disabled={!editCategoryId || editClassesForCategory.length === 0}
                >
                  <SelectTrigger id="class_id">
                    <SelectValue
                      placeholder={
                        !editCategoryId
                          ? "Pick a category first"
                          : editClassesForCategory.length === 0
                            ? "No classes"
                            : "None"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {editClassesForCategory.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" form={`edit-mapping-${soleSelectedMapping.description}`} disabled={isSavingEdit}>
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
