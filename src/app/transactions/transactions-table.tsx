"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PencilIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
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
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";
import { deleteTransactions, syncDescriptionsFromTransactions, updateTransaction } from "./actions";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { type SortKey } from "./sort";

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

const COLUMNS: { key: SortKey; label: string; align?: "right" | "center"; cellClassName?: string }[] = [
  { key: "date", label: "Date", cellClassName: "whitespace-nowrap" },
  { key: "description", label: "Description", cellClassName: "truncate font-medium" },
  { key: "account", label: "Account", cellClassName: "truncate" },
  { key: "category", label: "Category", align: "center", cellClassName: "text-center" },
  { key: "class", label: "Class", cellClassName: "truncate" },
  { key: "amount", label: "Amount", align: "right", cellClassName: "text-right" },
];

const DEFAULT_COLUMN_ORDER = COLUMNS.map((column) => column.key);

export function TransactionsTable({
  transactions,
  accounts,
  categories,
  classes,
  sortKey,
  sortDir,
  monthKey,
  accountParam,
  emptyMessage,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  classes: Class[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  monthKey: string;
  accountParam: string | undefined;
  emptyMessage: ReactNode;
}) {
  const [isSyncing, startSync] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [isSavingEdit, startSaveEdit] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editClassId, setEditClassId] = useState<string | null>(null);
  const { hidden: hiddenColumns, order: columnOrder, toggle: toggleColumn, move: moveColumn } =
    useColumnPreferences<SortKey>("transactions-table", DEFAULT_COLUMN_ORDER);

  const accountsById = new Map(accounts.map((a) => [a.id, a]));
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const classesById = new Map(classes.map((c) => [c.id, c]));
  const editClassesForCategory = editCategoryId
    ? classes.filter((c) => c.category_id === editCategoryId)
    : [];

  function sortHref(column: SortKey) {
    const nextDir: "asc" | "desc" = sortKey === column && sortDir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams({ month: monthKey });
    if (accountParam) params.set("account", accountParam);
    params.set("sort", column);
    params.set("dir", nextDir);
    return `/transactions?${params.toString()}`;
  }

  function renderCell(transaction: Transaction, key: SortKey) {
    switch (key) {
      case "date":
        return formatDate(transaction.date);
      case "description":
        return <span title={transaction.description}>{transaction.description}</span>;
      case "account": {
        const account = accountsById.get(transaction.account_id);
        return account?.label ? (
          <Badge variant="secondary" className="max-w-full gap-1 truncate">
            {account.label}
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
          <Badge variant="secondary" className="max-w-full gap-1 truncate">
            {transactionClass.name}
          </Badge>
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
    clear: clearSelection,
    selectedRows: selectedTransactions,
    soleSelectedRow: soleSelectedTransaction,
  } = useRowSelection(transactions, (transaction) => transaction.id);

  const syncEligibleCount = selectedTransactions.filter((t) => t.category_id).length;

  function openEditDialog() {
    if (!soleSelectedTransaction) return;
    setActionError(null);
    setEditCategoryId(soleSelectedTransaction.category_id);
    setEditClassId(soleSelectedTransaction.class_id);
    setEditDialogOpen(true);
  }

  function handleSync() {
    setActionError(null);
    startSync(async () => {
      try {
        const count = await syncDescriptionsFromTransactions(Array.from(selected));
        clearSelection();
        toast.success(
          count === 1 ? "Description saved — 1 transaction categorized." : `Description saved — ${count} transactions categorized.`,
        );
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to sync descriptions.");
      }
    });
  }

  function handleDelete() {
    if (selected.size === 0) return;
    const label = selected.size === 1 ? "this transaction" : `these ${selected.size} transactions`;
    if (!window.confirm(`Delete ${label}?`)) return;
    setActionError(null);
    startDelete(async () => {
      try {
        await deleteTransactions(Array.from(selected));
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
            disabled={syncEligibleCount === 0 || isSyncing}
            onClick={handleSync}
            aria-label="Sync"
            title="Sync"
          >
            <RefreshCwIcon className={isSyncing ? "animate-spin" : undefined} />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!soleSelectedTransaction}
            onClick={openEditDialog}
            aria-label="Edit"
            title="Edit"
          >
            <PencilIcon />
          </Button>
          {accounts.length > 0 ? (
            <AddTransactionDialog accounts={accounts} categories={categories} classes={classes} />
          ) : (
            <Button size="sm" render={<Link href="/accounts" />}>
              Create an account first
            </Button>
          )}
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

      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
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
                  href={sortHref(column.key)}
                  active={sortKey === column.key}
                  dir={sortDir}
                  align={column.align}
                >
                  {column.label}
                </SortableTableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id} className="group">
                <TableCell>
                  <Checkbox
                    checked={selected.has(transaction.id)}
                    onCheckedChange={() => toggleOne(transaction.id)}
                    aria-label={`Select ${transaction.description}`}
                    className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[checked]:opacity-100"
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
      )}

      {soleSelectedTransaction && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit transaction</DialogTitle>
            </DialogHeader>
            <form
              id={`edit-transaction-${soleSelectedTransaction.id}`}
              action={(formData) => {
                setActionError(null);
                startSaveEdit(async () => {
                  try {
                    await updateTransaction(formData);
                    setEditDialogOpen(false);
                    clearSelection();
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : "Failed to update transaction.");
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="id" value={soleSelectedTransaction.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={soleSelectedTransaction.description}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    defaultValue={splitDateTime(soleSelectedTransaction.date).date}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    defaultValue={splitDateTime(soleSelectedTransaction.date).time}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    defaultValue={soleSelectedTransaction.amount}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="account_id">Account</Label>
                <Select name="account_id" defaultValue={soleSelectedTransaction.account_id}>
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
              <div className="grid grid-cols-2 gap-4">
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
                      <SelectValue placeholder="Uncategorized" />
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
              </div>
              <DialogFooter>
                <Button type="submit" form={`edit-transaction-${soleSelectedTransaction.id}`} disabled={isSavingEdit}>
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
