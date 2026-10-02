"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BanknoteIcon,
  BoxIcon,
  CalendarIcon,
  LandmarkIcon,
  TagIcon,
  type LucideIcon,
} from "lucide-react";
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
import { useInactiveFilter } from "@/hooks/use-inactive-filter";
import { TransactionCardList } from "@/components/transaction-card-list";
import { ClassificationFields } from "@/components/classification-fields";
import type { Account, Category, Class, Autonomy, Transaction } from "@/lib/supabase/types";
import { setTransactionsActive, syncDescriptionsFromTransactions, updateTransaction } from "./transactions/actions";
import { AddTransactionDialog } from "./transactions/add-transaction-dialog";
import { AddMappingDialog } from "./descriptions/add-mapping-dialog";
import { type SortKey } from "./transactions/sort";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

const MONTH_ABBREVIATIONS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function formatDate(value: string) {
  const date = new Date(value);
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${day} ${MONTH_ABBREVIATIONS[date.getUTCMonth()]}`;
}

function splitDateTime(iso: string) {
  const parsed = new Date(iso);
  const date = parsed.toISOString().slice(0, 10);
  const time = `${String(parsed.getUTCHours()).padStart(2, "0")}:${String(parsed.getUTCMinutes()).padStart(2, "0")}`;
  return { date, time };
}

const COLUMNS: {
  key: SortKey;
  label: string;
  align?: "right" | "center";
  cellClassName?: string;
  headerIcon?: LucideIcon;
  headerIconOnly?: boolean;
}[] = [
  { key: "date", label: "Date", cellClassName: "whitespace-nowrap", headerIcon: CalendarIcon, headerIconOnly: true },
  { key: "description", label: "Description", cellClassName: "max-w-64 truncate font-medium" },
  { key: "account", label: "Account", cellClassName: "max-w-40 truncate", headerIcon: LandmarkIcon, headerIconOnly: true },
  {
    key: "category",
    label: "Category",
    align: "center",
    cellClassName: "text-center",
    headerIcon: BoxIcon,
    headerIconOnly: true,
  },
  {
    key: "class",
    label: "Class",
    align: "center",
    cellClassName: "text-center",
    headerIcon: TagIcon,
    headerIconOnly: true,
  },
  { key: "amount", label: "Amount", cellClassName: "text-right", headerIcon: BanknoteIcon, headerIconOnly: true },
];

const DEFAULT_COLUMN_ORDER = COLUMNS.map((column) => column.key);

export function DashboardTransactionsTable({
  transactions,
  accounts,
  categories,
  classes,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  classes: Class[];
}) {
  const [isSyncing, startSync] = useTransition();
  const [isTogglingActive, startToggleActive] = useTransition();
  const [isSavingEdit, startSaveEdit] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editClassId, setEditClassId] = useState<string | null>(null);
  const [editAutonomy, setEditAutonomy] = useState<Autonomy | null>(null);
  const [mappingPrefill, setMappingPrefill] = useState<string | null>(null);
  const editFormRef = useRef<HTMLFormElement>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { hidden: hiddenColumns, order: columnOrder, toggle: toggleColumn, move: moveColumn } =
    useColumnPreferences<SortKey>("dashboard-transactions-table", DEFAULT_COLUMN_ORDER);
  const {
    showInactive,
    setShowInactive,
    inactiveCount,
    visibleRows: visibleTransactions,
  } = useInactiveFilter(transactions, (transaction) => !transaction.is_hidden);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const classesById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

  function handleSort(column: SortKey) {
    if (sortKey === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column);
      setSortDir("asc");
    }
  }

  const sortedTransactions = useMemo(() => {
    return [...visibleTransactions].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "date":
          cmp = a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at);
          break;
        case "description":
          cmp = a.description.localeCompare(b.description);
          break;
        case "account":
          cmp = (accountsById.get(a.account_id)?.name ?? "").localeCompare(
            accountsById.get(b.account_id)?.name ?? "",
          );
          break;
        case "category": {
          const aName = (a.category_id ? categoriesById.get(a.category_id)?.name : undefined) ?? "";
          const bName = (b.category_id ? categoriesById.get(b.category_id)?.name : undefined) ?? "";
          cmp = aName.localeCompare(bName);
          break;
        }
        case "class": {
          const aName = (a.class_id ? classesById.get(a.class_id)?.name : undefined) ?? "";
          const bName = (b.class_id ? classesById.get(b.class_id)?.name : undefined) ?? "";
          cmp = aName.localeCompare(bName);
          break;
        }
        case "amount":
          cmp = a.amount - b.amount;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [visibleTransactions, sortKey, sortDir, accountsById, categoriesById, classesById]);

  function renderCell(transaction: Transaction, key: SortKey) {
    switch (key) {
      case "date":
        return formatDate(transaction.date);
      case "description":
        return (
          <div className="flex items-center gap-2">
            <span className="min-w-0 truncate" title={transaction.description}>
              {transaction.description}
            </span>
            {transaction.is_hidden && <Badge variant="outline" className="shrink-0">Inactive</Badge>}
          </div>
        );
      case "account": {
        const account = accountsById.get(transaction.account_id);
        return account ? (
          <Badge variant="secondary" className="max-w-full gap-1 truncate">
            {account.name}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      }
      case "category": {
        const category = transaction.category_id ? categoriesById.get(transaction.category_id) : null;
        return category ? (
          <span title={category.name} className="inline-flex">
            <CategoryIcon icon={category.icon} className="size-4" />
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Uncategorized</span>
        );
      }
      case "class": {
        const transactionClass = transaction.class_id ? classesById.get(transaction.class_id) : null;
        return transactionClass ? (
          <span title={transactionClass.name} className="inline-flex">
            <CategoryIcon icon={transactionClass.icon} className="size-4" />
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      }
      case "amount": {
        const category = transaction.category_id ? categoriesById.get(transaction.category_id) : null;
        const colorClassName =
          category?.kind === "transfer"
            ? "text-muted-foreground"
            : transaction.amount >= 0
              ? "text-emerald-600"
              : undefined;
        return <span className={colorClassName}>{formatCurrency(transaction.amount)}</span>;
      }
    }
  }

  const {
    selected,
    allSelected,
    someSelected,
    toggleAll,
    toggleOne,
    soleSelectedRow,
    clear: clearSelection,
    selectedRows: selectedTransactions,
  } = useRowSelection(sortedTransactions, (transaction) => transaction.id);

  function openEditDialog(transaction: Transaction) {
    setActionError(null);
    setEditCategoryId(transaction.category_id);
    setEditClassId(transaction.class_id);
    setEditAutonomy(transaction.autonomy);
    setEditingTransaction(transaction);
  }

  function handleSaveAndSyncDescription() {
    const form = editFormRef.current;
    if (!form) return;
    if (!form.reportValidity()) return;
    const formData = new FormData(form);
    setActionError(null);
    startSaveEdit(async () => {
      try {
        await updateTransaction(formData);
        const description = (formData.get("description") as string).trim().toLowerCase();
        setEditingTransaction(null);
        setMappingPrefill(description);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to save transaction.");
      }
    });
  }

  function setActive(ids: string[], isActive: boolean) {
    setActionError(null);
    startToggleActive(async () => {
      try {
        await setTransactionsActive(ids, isActive);
        clearSelection();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  }


  function handleSyncRow(transaction: Transaction) {
    setActionError(null);
    startSync(async () => {
      try {
        const count = await syncDescriptionsFromTransactions([transaction.id]);
        toast.success(
          count === 1 ? "Description saved — 1 transaction categorized." : `Description saved — ${count} transactions categorized.`,
        );
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to sync descriptions.");
      }
    });
  }

  const columnsByKey = new Map(COLUMNS.map((column) => [column.key, column]));
  const visibleColumns = columnOrder
    .map((key) => columnsByKey.get(key)!)
    .filter((column) => !hiddenColumns.has(column.key));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          ) : accounts.length > 0 ? (
            <AddTransactionDialog accounts={accounts} categories={categories} classes={classes} />
          ) : (
            <Button size="sm" render={<Link href="/accounts" />}>
              Create an account first
            </Button>
          )}
          {selected.size > 0 && (
            <RowActionsMenu
              onEdit={soleSelectedRow ? () => openEditDialog(soleSelectedRow) : undefined}
              onCreateRule={soleSelectedRow?.category_id ? () => handleSyncRow(soleSelectedRow) : undefined}
              onDeactivate={
                selectedTransactions.some((transaction) => !transaction.is_hidden)
                  ? () => setActive(Array.from(selected), false)
                  : undefined
              }
              onActivate={
                selectedTransactions.some((transaction) => transaction.is_hidden)
                  ? () => setActive(Array.from(selected), true)
                  : undefined
              }
              disabled={isSyncing || isTogglingActive}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {inactiveCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowInactive(!showInactive)}>
              {showInactive ? "Hide inactive" : `Show inactive (${inactiveCount})`}
            </Button>
          )}
          {/* Phones get the card list below, which has no columns to pick. */}
          <div className="hidden sm:block">
            <ColumnsMenu columns={COLUMNS} order={columnOrder} hidden={hiddenColumns} onToggle={toggleColumn} onMove={moveColumn} />
          </div>
        </div>
      </div>
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {/* An empty selection renders nothing here — the phone sheet's
          "0 transactions" header already says so (per explicit user request). */}
      {sortedTransactions.length > 0 && (
        <>
          {/* Phone: one two-line card per transaction instead of the table. */}
          <TransactionCardList
            className="sm:hidden"
            transactions={sortedTransactions}
            accountsById={accountsById}
            categoriesById={categoriesById}
            classesById={classesById}
            formatDate={formatDate}
            renderAmount={(transaction) => renderCell(transaction, "amount")}
            selected={selected}
            allSelected={allSelected}
            someSelected={someSelected}
            onToggleAll={toggleAll}
            onToggleOne={toggleOne}
            onOpen={openEditDialog}
            sortOptions={COLUMNS}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={(key, dir) => {
              setSortKey(key);
              setSortDir(dir);
            }}
          />
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-0">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all transactions"
                    />
                  </TableHead>
                  {visibleColumns.map((column) => (
                    <SortableTableHead
                      key={column.key}
                      onSort={() => handleSort(column.key)}
                      active={sortKey === column.key}
                      dir={sortDir}
                      align={column.align}
                    >
                      {column.headerIcon ? (
                        <ColumnHeaderIcon icon={column.headerIcon} label={column.label} iconOnly={column.headerIconOnly} />
                      ) : (
                        column.label
                      )}
                    </SortableTableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {sortedTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className={transaction.is_hidden ? "group text-muted-foreground" : "group"}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(transaction.id)}
                        onCheckedChange={() => toggleOne(transaction.id)}
                        aria-label={`Select ${transaction.description}`}
                        className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[checked]:opacity-100 pointer-coarse:opacity-100"
                      />
                    </TableCell>
                    {visibleColumns.map((column) => (
                      <TableCell key={column.key} className={column.cellClassName}>
                        {renderCell(transaction, column.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {editingTransaction && (
        <Dialog open={editingTransaction !== null} onOpenChange={(open) => !open && setEditingTransaction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit transaction</DialogTitle>
            </DialogHeader>
            <form
              id={`edit-transaction-${editingTransaction.id}`}
              ref={editFormRef}
              action={(formData) => {
                setActionError(null);
                startSaveEdit(async () => {
                  try {
                    await updateTransaction(formData);
                    setEditingTransaction(null);
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : "Failed to update transaction.");
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="id" value={editingTransaction.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={editingTransaction.description}
                  required
                />
              </div>
              <input type="hidden" name="time" value={splitDateTime(editingTransaction.date).time} />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    defaultValue={splitDateTime(editingTransaction.date).date}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    defaultValue={editingTransaction.amount}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="account_id">Account</Label>
                <Select name="account_id" defaultValue={editingTransaction.account_id}>
                  <SelectTrigger id="account_id">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ClassificationFields
                categories={categories}
                classes={classes}
                categoryId={editCategoryId}
                classId={editClassId}
                onCategoryChange={setEditCategoryId}
                onClassChange={setEditClassId}
                autonomy={editAutonomy}
                onAutonomyChange={setEditAutonomy}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveAndSyncDescription}
                  disabled={isSavingEdit}
                >
                  Save and map description
                </Button>
                <Button type="submit" form={`edit-transaction-${editingTransaction.id}`} disabled={isSavingEdit}>
                  {isSavingEdit ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {mappingPrefill !== null && (
        <AddMappingDialog
          categories={categories}
          classes={classes}
          defaultDescription={mappingPrefill}
          defaultCategoryId={editCategoryId}
          defaultClassId={editClassId}
          open
          onOpenChange={(next) => {
            if (!next) setMappingPrefill(null);
          }}
          showTrigger={false}
        />
      )}
    </div>
  );
}
