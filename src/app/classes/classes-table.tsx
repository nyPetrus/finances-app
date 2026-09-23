"use client";

import { useState, useTransition } from "react";
import { ArchiveIcon, ArchiveRestoreIcon, TagIcon, TagsIcon, Trash2Icon, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useInactiveFilter } from "@/hooks/use-inactive-filter";
import { GORDURA_LABELS } from "@/lib/classification";
import type { Category, Class } from "@/lib/supabase/types";
import { deleteClasses, setClassesActive, updateClass } from "./actions";
import { AddClassDialog } from "./add-class-dialog";
import { ClassFormFields } from "./class-form-fields";
import { type SortKey } from "./sort";

const COLUMNS: {
  key: SortKey;
  label: string;
  align?: "center";
  cellClassName?: string;
  headerIcon?: LucideIcon;
  headerIconOnly?: boolean;
}[] = [
  { key: "name", label: "Name", cellClassName: "font-medium", headerIcon: TagsIcon },
  {
    key: "category",
    label: "Categories",
    align: "center",
    cellClassName: "text-center",
    headerIcon: TagIcon,
    headerIconOnly: true,
  },
  { key: "gordura", label: "Default gordura", align: "center", cellClassName: "text-center" },
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
  const [isTogglingActive, startToggleActive] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  // Classes a delete skipped because they're in use, offered a one-click
  // "Deactivate instead" next to the error.
  const [inUseIds, setInUseIds] = useState<string[]>([]);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const { hidden: hiddenColumns, order: columnOrder, toggle: toggleColumn, move: moveColumn } =
    useColumnPreferences<SortKey>("classes-table", DEFAULT_COLUMN_ORDER);
  const { showInactive, setShowInactive, inactiveCount, visibleRows: visibleClasses } = useInactiveFilter(classes);

  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  function sortHref(column: SortKey) {
    const nextDir: "asc" | "desc" = sortKey === column && sortDir === "asc" ? "desc" : "asc";
    return `/classes?${new URLSearchParams({ sort: column, dir: nextDir }).toString()}`;
  }

  function renderCell(classItem: Class, key: SortKey) {
    switch (key) {
      case "name":
        return (
          <span className="inline-flex items-center gap-2">
            {classItem.name}
            {!classItem.is_active && <Badge variant="outline">Inactive</Badge>}
          </span>
        );
      case "category": {
        const linked = classItem.category_ids
          .map((id) => categoriesById.get(id))
          .filter((category): category is Category => !!category)
          .sort((a, b) => a.name.localeCompare(b.name));
        return linked.length > 0 ? (
          <span className="inline-flex flex-wrap justify-center gap-1.5">
            {linked.map((category) => (
              <span key={category.id} title={category.name} className="inline-flex">
                <CategoryIcon icon={category.icon} className="size-4" />
              </span>
            ))}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      }
      case "gordura":
        return classItem.default_gordura ? (
          GORDURA_LABELS[classItem.default_gordura]
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
    }
  }

  const {
    selected,
    allSelected,
    someSelected,
    toggleAll,
    toggleOne,
    clear: clearSelection,
  } = useRowSelection(visibleClasses, (classItem) => classItem.id);

  const selectedClasses = visibleClasses.filter((classItem) => selected.has(classItem.id));
  const isBusy = isDeleting || isTogglingActive;

  function runDelete(ids: string[]) {
    setActionError(null);
    setInUseIds([]);
    startDelete(async () => {
      try {
        const result = await deleteClasses(ids);
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
        await setClassesActive(ids, isActive);
        clearSelection();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  }

  function handleDelete() {
    if (selected.size === 0) return;
    const label = selected.size === 1 ? "this class" : `these ${selected.size} classes`;
    if (!window.confirm(`Delete ${label}? Classes still in use will be skipped.`)) return;
    runDelete(Array.from(selected));
  }

  function handleDeleteRow(classItem: Class) {
    if (!window.confirm(`Delete this class?`)) return;
    runDelete([classItem.id]);
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
          {selectedClasses.some((classItem) => classItem.is_active) && (
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
          {selectedClasses.some((classItem) => !classItem.is_active) && (
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

      {visibleClasses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No classes yet.</p>
      ) : (
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
              <TableHead className="w-0" />
              {visibleColumns.map((column) => (
                <SortableTableHead key={column.key} href={sortHref(column.key)} active={sortKey === column.key} dir={sortDir} align={column.align}>
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
            {visibleClasses.map((classItem) => (
              <TableRow key={classItem.id} className={classItem.is_active ? "group" : "group text-muted-foreground"}>
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
                    onToggleActive={() => setActive([classItem.id], !classItem.is_active)}
                    isActive={classItem.is_active}
                    disabled={isBusy}
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
              <DialogTitle>Edit class</DialogTitle>
            </DialogHeader>
            <form
              id={`edit-class-${editingClass.id}`}
              action={(formData) => {
                setActionError(null);
                startSaveEdit(async () => {
                  try {
                    const result = await updateClass(formData);
                    if (result.error) setActionError(result.error);
                    else setEditingClass(null);
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : "Failed to update class.");
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="id" value={editingClass.id} />
              <ClassFormFields categories={categories} classItem={editingClass} />
              <DialogFooter>
                <Button type="submit" form={`edit-class-${editingClass.id}`} disabled={isSavingEdit}>
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
