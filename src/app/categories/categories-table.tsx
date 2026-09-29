"use client";

import { Fragment, useState, useTransition } from "react";
import { BoxIcon, HandFistIcon, LinkIcon, PlusIcon, TagIcon, UnlinkIcon, type LucideIcon } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { AUTONOMY_LABELS, AUTONOMY_SYMBOLS } from "@/lib/classification";
import type { Category, Class } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { TRANSACTION_TYPE_SYMBOL_ROTATION, TRANSACTION_TYPE_SYMBOLS } from "@/lib/transaction-type";
import {
  deleteClasses,
  setClassesActive,
  unlinkClassesFromCategories,
  updateClass,
} from "@/app/classes/actions";
import { AddClassDialog } from "@/app/classes/add-class-dialog";
import { ClassFormFields } from "@/app/classes/class-form-fields";
import { deleteCategories, setCategoriesActive, updateCategory } from "./actions";
import { AddCategoryDialog } from "./add-category-dialog";
import { LinkClassDialog } from "./link-class-dialog";
import { type SortKey } from "./sort";

// One category and the classes linked to it, in display order. `category` is
// null for the trailing "(No category)" group of unlinked classes.
export type CategoryGroup = { category: Category | null; classes: Class[] };

// A selectable row. A class row is one (category, class) link, so the same
// class under two categories is two rows with two keys.
type TreeRow =
  | { type: "category"; key: string; category: Category }
  | { type: "class"; key: string; classItem: Class; categoryId: string | null };

const NO_CATEGORY_KEY = "none";

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
  { key: "name", label: "Name", cellClassName: "max-w-96 font-medium", headerIcon: BoxIcon },
  { key: "type", label: "Type", cellClassName: "text-center" },
  { key: "classes", label: "Classes", cellClassName: "text-center", headerIcon: TagIcon, headerIconOnly: true },
  { key: "autonomy", label: "Autonomy", cellClassName: "text-center", headerIcon: HandFistIcon, headerIconOnly: true },
];

const DEFAULT_COLUMN_ORDER = COLUMNS.map((column) => column.key);

function groupKey(group: CategoryGroup) {
  return group.category?.id ?? NO_CATEGORY_KEY;
}

export function CategoriesTable({
  groups,
  categories,
  classes,
  sortKey,
  sortDir,
}: {
  groups: CategoryGroup[];
  // Every category (by name) and class, for the class form and link dialog.
  categories: Category[];
  classes: Class[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
}) {
  const [isDeleting, startDelete] = useTransition();
  const [isSavingEdit, startSaveEdit] = useTransition();
  const [isMutating, startMutate] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  // Rows a delete skipped because they're in use, offered a one-click
  // "Deactivate instead" next to the error.
  const [inUse, setInUse] = useState<{ type: "category" | "class"; ids: string[] } | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editIcon, setEditIcon] = useState("");
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  // undefined = closed; "" = open with no category preselected.
  const [addClassFor, setAddClassFor] = useState<string | undefined>(undefined);
  const [linkingTo, setLinkingTo] = useState<Category | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showInactive, setShowInactive] = useState(false);
  const { hidden: hiddenColumns, order: columnOrder, toggle: toggleColumn, move: moveColumn } =
    useColumnPreferences<SortKey>("categories-table", DEFAULT_COLUMN_ORDER);

  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  const inactiveCount =
    categories.filter((category) => !category.is_active).length +
    classes.filter((classItem) => !classItem.is_active).length;

  // Inactive categories hide along with everything under them; inactive
  // classes hide from every category they're in.
  const visibleGroups = groups
    .filter((group) => showInactive || !group.category || group.category.is_active)
    .map((group) => ({
      ...group,
      classes: showInactive ? group.classes : group.classes.filter((classItem) => classItem.is_active),
    }))
    .filter((group) => group.category || group.classes.length > 0);

  const selectableRows: TreeRow[] = visibleGroups.flatMap((group) => {
    const key = groupKey(group);
    const categoryRow: TreeRow[] = group.category ? [{ type: "category", key: `cat:${key}`, category: group.category }] : [];
    const classRows: TreeRow[] = expanded.has(key)
      ? group.classes.map((classItem) => ({
          type: "class",
          key: `cls:${key}:${classItem.id}`,
          classItem,
          categoryId: group.category?.id ?? null,
        }))
      : [];
    return [...categoryRow, ...classRows];
  });

  const {
    selected,
    allSelected,
    someSelected,
    toggleAll,
    toggleOne,
    selectedRows,
    soleSelectedRow,
    clear: clearSelection,
  } = useRowSelection(selectableRows, (row) => row.key);

  const selectedCategories = selectedRows.flatMap((row) => (row.type === "category" ? [row.category] : []));
  const selectedLinks = selectedRows.flatMap((row) => (row.type === "class" ? [row] : []));
  const selectedClasses = [...new Map(selectedLinks.map((row) => [row.classItem.id, row.classItem])).values()];
  const isBusy = isDeleting || isMutating;

  function toggleExpanded(key: string) {
    const collapsing = expanded.has(key);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (collapsing) next.delete(key);
      else next.add(key);
      return next;
    });
    // Rows that disappear can't stay selected behind the user's back.
    if (collapsing) {
      for (const id of selected) if (id.startsWith(`cls:${key}:`)) toggleOne(id);
    }
  }

  const allExpanded = visibleGroups.length > 0 && visibleGroups.every((group) => expanded.has(groupKey(group)));

  function toggleExpandAll() {
    if (allExpanded) {
      setExpanded(new Set());
      for (const id of selected) if (id.startsWith("cls:")) toggleOne(id);
    } else {
      setExpanded(new Set(visibleGroups.map(groupKey)));
    }
  }

  function sortHref(column: SortKey) {
    const nextDir: "asc" | "desc" = sortKey === column && sortDir === "asc" ? "desc" : "asc";
    return `/categories?${new URLSearchParams({ sort: column, dir: nextDir }).toString()}`;
  }

  function resetMessages() {
    setActionError(null);
    setInUse(null);
  }

  function setActive(categoryIds: string[], classIds: string[], isActive: boolean) {
    resetMessages();
    startMutate(async () => {
      try {
        await Promise.all([
          categoryIds.length > 0 ? setCategoriesActive(categoryIds, isActive) : null,
          classIds.length > 0 ? setClassesActive(classIds, isActive) : null,
        ]);
        clearSelection();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  }

  // Delete is offered only for a selection of one kind — deleting categories
  // and classes in one go is too easy to do by accident.
  function handleDelete() {
    const type = selectedCategories.length > 0 ? "category" : "class";
    const ids = type === "category" ? selectedCategories.map((c) => c.id) : selectedClasses.map((c) => c.id);
    const noun = type === "category" ? ["category", "categories"] : ["class", "classes"];
    const label = ids.length === 1 ? `this ${noun[0]}` : `these ${ids.length} ${noun[1]}`;
    const extra = type === "class" ? " This removes it from every category it's in." : "";
    if (!window.confirm(`Delete ${label}?${extra} Ones still in use will be skipped.`)) return;
    resetMessages();
    startDelete(async () => {
      try {
        const result = await (type === "category" ? deleteCategories(ids) : deleteClasses(ids));
        clearSelection();
        setActionError(result.error);
        if (result.inUseIds.length > 0) setInUse({ type, ids: result.inUseIds });
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to delete.");
      }
    });
  }

  function handleUnlink() {
    const links = selectedLinks.flatMap((row) =>
      row.categoryId ? [{ categoryId: row.categoryId, classId: row.classItem.id }] : [],
    );
    resetMessages();
    startMutate(async () => {
      try {
        const result = await unlinkClassesFromCategories(links);
        clearSelection();
        setActionError(result.error);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to remove.");
      }
    });
  }

  function openEdit(row: TreeRow) {
    resetMessages();
    if (row.type === "category") {
      setEditIcon(row.category.icon);
      setEditingCategory(row.category);
    } else {
      setEditingClass(row.classItem);
    }
  }

  const soleCategory = soleSelectedRow?.type === "category" ? soleSelectedRow.category : null;
  const extraActions: { label: string; icon: LucideIcon; onClick: () => void }[] = [];
  if (soleCategory) {
    // Expand the category too, so the class shows up where it was added.
    const expandSole = () => setExpanded((prev) => new Set(prev).add(soleCategory.id));
    extraActions.push(
      {
        label: "Add class",
        icon: PlusIcon,
        onClick: () => {
          expandSole();
          setAddClassFor(soleCategory.id);
        },
      },
      {
        label: "Link existing class",
        icon: LinkIcon,
        onClick: () => {
          expandSole();
          setLinkingTo(soleCategory);
        },
      },
    );
  }
  if (
    selectedCategories.length === 0 &&
    selectedLinks.length > 0 &&
    selectedLinks.every((row) => row.categoryId !== null)
  ) {
    extraActions.push({ label: "Remove from category", icon: UnlinkIcon, onClick: handleUnlink });
  }

  const anyActive =
    selectedCategories.some((c) => c.is_active) || selectedClasses.some((c) => c.is_active);
  const anyInactive =
    selectedCategories.some((c) => !c.is_active) || selectedClasses.some((c) => !c.is_active);
  const selectionIds = [selectedCategories.map((c) => c.id), selectedClasses.map((c) => c.id)] as const;
  const mixedSelection = selectedCategories.length > 0 && selectedLinks.length > 0;

  const columnsByKey = new Map(COLUMNS.map((column) => [column.key, column]));
  const visibleColumns = columnOrder
    .map((key) => columnsByKey.get(key)!)
    .filter((column) => !hiddenColumns.has(column.key));

  function renderCategoryCell(group: CategoryGroup, key: SortKey) {
    const category = group.category;
    switch (key) {
      case "name":
        return (
          <div className="flex items-center gap-2">
            {category ? (
              <CategoryIcon icon={category.icon} className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <span className="size-4 shrink-0" />
            )}
            <span className={cn("min-w-0 truncate", !category && "italic text-muted-foreground")}>
              {category ? category.name : "(No category)"}
            </span>
            {category && !category.is_active && <Badge variant="outline">Inactive</Badge>}
          </div>
        );
      case "type":
        // Symbol only, name as tooltip (see the symbol-display rule in
        // table-page-conventions). Same size/weight as the Dashboard
        // dynamic table's Type symbol.
        return category ? (
          <span
            title={kindLabels[category.kind]}
            className={cn(
              "inline-block text-base font-bold text-muted-foreground",
              TRANSACTION_TYPE_SYMBOL_ROTATION[category.kind],
            )}
          >
            {TRANSACTION_TYPE_SYMBOLS[category.kind]}
          </span>
        ) : null;
      case "classes":
        return <span className="text-sm text-muted-foreground">{group.classes.length}</span>;
      case "autonomy":
        return null;
    }
  }

  function renderClassCell(classItem: Class, categoryId: string | null, key: SortKey) {
    switch (key) {
      case "name": {
        const alsoIn = classItem.category_ids
          .filter((id) => id !== categoryId)
          .map((id) => categoriesById.get(id))
          .filter((category): category is Category => !!category)
          .sort((a, b) => a.name.localeCompare(b.name));
        return (
          <div className="flex items-center gap-2 pl-6 font-normal">
            <CategoryIcon icon={classItem.icon} className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">{classItem.name}</span>
            {!classItem.is_active && <Badge variant="outline">Inactive</Badge>}
            {alsoIn.length > 0 && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                also in
                {alsoIn.map((category) => (
                  <span key={category.id} title={category.name} className="inline-flex">
                    <CategoryIcon icon={category.icon} className="size-3.5" />
                  </span>
                ))}
              </span>
            )}
          </div>
        );
      }
      case "autonomy":
        return classItem.autonomy ? (
          <span title={AUTONOMY_LABELS[classItem.autonomy]}>{AUTONOMY_SYMBOLS[classItem.autonomy]}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      case "type":
      case "classes":
        return null;
    }
  }

  const checkboxClassName =
    "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[checked]:opacity-100 pointer-coarse:opacity-100";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" aria-label="Add category or class" title="Add category or class" />}
              >
                <PlusIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setAddCategoryOpen(true)}>
                  <BoxIcon />
                  Category
                </DropdownMenuItem>
                <DropdownMenuItem disabled={categories.length === 0} onClick={() => setAddClassFor("")}>
                  <TagIcon />
                  Class
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {selected.size > 0 && (
            <RowActionsMenu
              onEdit={soleSelectedRow ? () => openEdit(soleSelectedRow) : undefined}
              extraActions={extraActions}
              onDeactivate={anyActive ? () => setActive(...selectionIds, false) : undefined}
              onActivate={anyInactive ? () => setActive(...selectionIds, true) : undefined}
              onDelete={mixedSelection ? undefined : handleDelete}
              disabled={isBusy}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {visibleGroups.length > 0 && (
            <Button variant="ghost" size="sm" onClick={toggleExpandAll}>
              {allExpanded ? "Collapse all" : "Expand all"}
            </Button>
          )}
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
          {inUse && (
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() =>
                inUse.type === "category" ? setActive(inUse.ids, [], false) : setActive([], inUse.ids, false)
              }
            >
              Deactivate instead
            </Button>
          )}
        </div>
      )}

      {visibleGroups.length === 0 ? (
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
                  aria-label="Select all rows"
                />
              </TableHead>
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
            {visibleGroups.map((group) => {
              const key = groupKey(group);
              const isExpanded = expanded.has(key);
              const canExpand = group.classes.length > 0;
              const rowKey = `cat:${key}`;
              return (
                <Fragment key={key}>
                  <TableRow
                    className={cn("group", group.category && !group.category.is_active && "text-muted-foreground")}
                  >
                    <TableCell>
                      {group.category && (
                        <Checkbox
                          checked={selected.has(rowKey)}
                          onCheckedChange={() => toggleOne(rowKey)}
                          aria-label={`Select ${group.category.name}`}
                          className={checkboxClassName}
                        />
                      )}
                    </TableCell>
                    {visibleColumns.map((column) => (
                      <TableCell
                        key={column.key}
                        // Clicking the name expands/collapses, like the
                        // Dashboard's dynamic table (no separate toggle).
                        onClick={column.key === "name" && canExpand ? () => toggleExpanded(key) : undefined}
                        title={
                          column.key === "name" && canExpand ? (isExpanded ? "Hide classes" : "Show classes") : undefined
                        }
                        className={cn(column.cellClassName, column.key === "name" && canExpand && "cursor-pointer select-none")}
                      >
                        {renderCategoryCell(group, column.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                  {isExpanded &&
                    group.classes.map((classItem) => {
                      const classRowKey = `cls:${key}:${classItem.id}`;
                      return (
                        <TableRow
                          key={classRowKey}
                          className={cn("group bg-muted/30", !classItem.is_active && "text-muted-foreground")}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selected.has(classRowKey)}
                              onCheckedChange={() => toggleOne(classRowKey)}
                              aria-label={`Select ${classItem.name}`}
                              className={checkboxClassName}
                            />
                          </TableCell>
                          {visibleColumns.map((column) => (
                            <TableCell key={column.key} className={column.cellClassName}>
                              {renderClassCell(classItem, group.category?.id ?? null, column.key)}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      )}

      <AddCategoryDialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen} />
      <AddClassDialog
        key={addClassFor ?? "closed"}
        categories={categories}
        defaultCategoryId={addClassFor || undefined}
        open={addClassFor !== undefined}
        onOpenChange={(open) => {
          if (open) return;
          setAddClassFor(undefined);
          clearSelection();
        }}
      />
      {linkingTo && (
        <LinkClassDialog
          category={linkingTo}
          classes={classes}
          onClose={() => {
            setLinkingTo(null);
            clearSelection();
          }}
        />
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
