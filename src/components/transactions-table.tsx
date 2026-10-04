"use client";

import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
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
import { AccountOptionLabel, AccountTypeIcon } from "@/components/account-type-icon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AmountInput, DateInput } from "@/components/locale-inputs";
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
import { type SortKey } from "@/lib/transaction-sort";
import {
  setTransactionsActive,
  syncDescriptionsFromTransactions,
  updateTransaction,
} from "@/app/transactions/actions";
import { AddTransactionDialog } from "@/app/transactions/add-transaction-dialog";
import { AddMappingDialog } from "@/app/descriptions/add-mapping-dialog";
import { BulkEditDialog } from "@/components/bulk-edit-dialog";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

const MONTH_ABBREVIATIONS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

// `11 set 26`, or `11 set` without the year.
function formatDate(value: string, showYear: boolean) {
  const date = new Date(value);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const dayMonth = `${day} ${MONTH_ABBREVIATIONS[date.getUTCMonth()]}`;
  return showYear ? `${dayMonth} ${String(date.getUTCFullYear()).slice(-2)}` : dayMonth;
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
  {
    key: "account",
    label: "Account",
    align: "center",
    cellClassName: "max-w-40 truncate text-center",
    headerIcon: LandmarkIcon,
    headerIconOnly: true,
  },
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
  // The account's balance: filled in for statement imports that report it
  // (per transaction), and by the Pluggy sync for bank accounts (end of day,
  // the same value on every transaction of that day).
  { key: "balance", label: "Balance", align: "right", cellClassName: "text-right whitespace-nowrap" },
];

const DEFAULT_COLUMN_ORDER = COLUMNS.map((column) => column.key);

/**
 * The app's transaction table, shared by Search (`SearchTable`) and the
 * Dashboard's click-to-filter panel (`DashboardTransactionsTable`): columns,
 * row selection, the toolbar and its "⋮", show inactive, the Columns menu,
 * the single-row edit / bulk edit / map-description dialogs, and the phone
 * card list. It renders `transactions` in the order given — the caller owns
 * sorting (Search via the URL and the server, the Dashboard in local state)
 * and hears about sort clicks through `onSortChange`; with `sortHref` the
 * headers are real links instead. The remaining props are the few
 * deliberate per-page differences.
 */
export function TransactionsTable({
  transactions,
  accounts,
  categories,
  classes,
  sortKey,
  sortDir,
  onSortChange,
  sortHref,
  columnsStorageKey,
  showYear,
  compactRows = false,
  emptyMessage,
  toolbarExtra,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  classes: Class[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSortChange: (key: SortKey, dir: "asc" | "desc") => void;
  // Builds a header's link (toggling the active column, else asc).
  sortHref?: (key: SortKey, dir: "asc" | "desc") => string;
  // localStorage key for this page's own column show/hide & order.
  columnsStorageKey: string;
  // Date as `11 set 26` (true) or `11 set` (false).
  showYear: boolean;
  // Body rows one step smaller (`text-xs`) — the Dashboard's panel.
  compactRows?: boolean;
  // Shown when there are no rows; omitted, nothing renders there.
  emptyMessage?: string;
  // Extra page-wide toolbar buttons, after Add (Search's Sync descriptions).
  toolbarExtra?: ReactNode;
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
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const editFormRef = useRef<HTMLFormElement>(null);
  const { hidden: hiddenColumns, order: columnOrder, toggle: toggleColumn, move: moveColumn } =
    useColumnPreferences<SortKey>(columnsStorageKey, DEFAULT_COLUMN_ORDER);
  const {
    showInactive,
    setShowInactive,
    inactiveCount,
    visibleRows: visibleTransactions,
  } = useInactiveFilter(transactions, (transaction) => !transaction.is_hidden);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const classesById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

  function formatRowDate(value: string) {
    return formatDate(value, showYear);
  }

  // A header click toggles the active column's direction, else starts asc.
  function nextSortDir(column: SortKey): "asc" | "desc" {
    return sortKey === column && sortDir === "asc" ? "desc" : "asc";
  }

  function renderCell(transaction: Transaction, key: SortKey) {
    switch (key) {
      case "date":
        return formatRowDate(transaction.date);
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
          <Badge variant="secondary" className="max-w-full gap-1">
            <AccountTypeIcon type={account.type} className="size-3" />
            <span className="min-w-0 truncate">{account.name}</span>
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
          <span className="text-sm text-orange-600 dark:text-orange-400">Uncategorized</span>
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
      case "balance":
        return transaction.balance === null ? null : (
          <span className="text-muted-foreground">{formatCurrency(transaction.balance)}</span>
        );
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
  } = useRowSelection(visibleTransactions, (transaction) => transaction.id);

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
          {toolbarExtra}
          {selected.size > 0 && (
            <RowActionsMenu
              // One row opens the full edit dialog; several open the batch
              // Category/Class/Autonomy editor — one Edit either way.
              onEdit={soleSelectedRow ? () => openEditDialog(soleSelectedRow) : () => setBulkEditOpen(true)}
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

      {visibleTransactions.length === 0 ? (
        emptyMessage && <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <>
          {/* Phone: one two-line card per transaction instead of the table. */}
          <TransactionCardList
            className="sm:hidden"
            transactions={visibleTransactions}
            accountsById={accountsById}
            categoriesById={categoriesById}
            classesById={classesById}
            formatDate={formatRowDate}
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
            onSortChange={onSortChange}
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
                      {...(sortHref
                        ? { href: sortHref(column.key, nextSortDir(column.key)) }
                        : { onSort: () => onSortChange(column.key, nextSortDir(column.key)) })}
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
              <TableBody className={compactRows ? "text-xs" : undefined}>
                {visibleTransactions.map((transaction) => (
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
                  <DateInput id="date" name="date" defaultValue={splitDateTime(editingTransaction.date).date} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <AmountInput id="amount" name="amount" defaultValue={editingTransaction.amount} required />
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
                        <AccountOptionLabel account={account} />
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

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        transactionIds={Array.from(selected)}
        categories={categories}
        classes={classes}
        onSaved={clearSelection}
      />
    </div>
  );
}
