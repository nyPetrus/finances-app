"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LandmarkIcon, RefreshCwIcon, type LucideIcon } from "lucide-react";
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
import { CardListHeader } from "@/components/card-list-header";
import {
  ACCOUNT_TYPES,
  AccountSourceIcon,
  AccountTypeIcon,
  AccountTypeOptionLabel,
} from "@/components/account-type-icon";
import { cn } from "@/lib/utils";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useColumnPreferences } from "@/hooks/use-column-preferences";
import { useInactiveFilter } from "@/hooks/use-inactive-filter";
import type { Account } from "@/lib/supabase/types";
import { setAccountsActive, updateAccount } from "./actions";
import { AddAccountMenu } from "./add-account-menu";
import { ImportTransactionsDialog } from "./import-transactions-dialog";
import { syncPluggyItem } from "./pluggy-actions";
import { type SortKey } from "./sort";


function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

// "Last update": the last Pluggy sync for automatic accounts (sync stamps
// updated_at; nothing else does), the last statement file import for manual
// ones — null until the first import.
function lastUpdateOf(account: Account) {
  return account.is_automatic ? account.updated_at : account.last_imported_at;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

const COLUMNS: {
  key: SortKey;
  label: string;
  align?: "right" | "center";
  cellClassName?: string;
  headerIcon?: LucideIcon;
  headerIconOnly?: boolean;
}[] = [
  { key: "name", label: "Account", cellClassName: "max-w-56 font-medium", headerIcon: LandmarkIcon },
  { key: "lastSync", label: "Last update", align: "center", cellClassName: "text-center whitespace-nowrap" },
  { key: "transactions", label: "Transactions", cellClassName: "text-right whitespace-nowrap" },
  { key: "balance", label: "Balance", cellClassName: "text-right whitespace-nowrap" },
];

const DEFAULT_COLUMN_ORDER = COLUMNS.map((column) => column.key);

function renderCell(account: Account, key: SortKey, transactionsTotalByAccount: Record<string, number>) {
  switch (key) {
    // Name first, type icon last — the same composition as the transaction
    // tables' Account chip. Replaces what used to be a separate Type column.
    case "name":
      return (
        <span className="inline-flex max-w-full items-center gap-2">
          <span className="min-w-0 truncate">{account.name}</span>
          <AccountTypeIcon type={account.type} />
          {!account.is_active && <Badge variant="outline">Inactive</Badge>}
        </span>
      );
    // The source icon (plug = synced, file = imported) leads the value, so
    // it says what kind of update the time is — and replaces what used to
    // be a separate Source column.
    case "lastSync": {
      const lastUpdate = lastUpdateOf(account);
      return (
        <span className="inline-flex items-center gap-1.5">
          <AccountSourceIcon account={account} className="text-muted-foreground" />
          {lastUpdate ? formatDateTime(lastUpdate) : <span className="text-sm text-muted-foreground">—</span>}
        </span>
      );
    }
    case "balance":
      return formatCurrency(account.current_balance);
    case "transactions":
      return formatCurrency(transactionsTotalByAccount[account.id] ?? 0);
  }
}

export function AccountsTable({
  accounts,
  transactionsTotalByAccount,
  sortKey,
  sortDir,
}: {
  accounts: Account[];
  transactionsTotalByAccount: Record<string, number>;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
}) {
  const router = useRouter();
  const [isSyncing, startSync] = useTransition();
  const [isTogglingActive, startToggleActive] = useTransition();
  const [isSavingEdit, startSaveEdit] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [importingAccount, setImportingAccount] = useState<Account | null>(null);
  const { hidden: hiddenColumns, order: columnOrder, toggle: toggleColumn, move: moveColumn } =
    useColumnPreferences<SortKey>("accounts-table", DEFAULT_COLUMN_ORDER);
  const {
    showInactive,
    setShowInactive,
    inactiveCount,
    visibleRows: visibleAccounts,
  } = useInactiveFilter(accounts, (account) => account.is_active);

  function sortHref(column: SortKey, dir?: "asc" | "desc") {
    const nextDir: "asc" | "desc" = dir ?? (sortKey === column && sortDir === "asc" ? "desc" : "asc");
    return `/accounts?${new URLSearchParams({ sort: column, dir: nextDir }).toString()}`;
  }

  const sorted = useMemo(() => {
    return [...visibleAccounts].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "lastSync":
          cmp = (lastUpdateOf(a) ?? "").localeCompare(lastUpdateOf(b) ?? "");
          break;
        case "balance":
          cmp = a.current_balance - b.current_balance;
          break;
        case "transactions":
          cmp =
            (transactionsTotalByAccount[a.id] ?? 0) - (transactionsTotalByAccount[b.id] ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [visibleAccounts, sortKey, sortDir, transactionsTotalByAccount]);

  const {
    selected,
    allSelected,
    someSelected,
    toggleAll,
    toggleOne,
    soleSelectedRow,
    clear: clearSelection,
    selectedRows: selectedAccounts,
  } = useRowSelection(sorted, (account) => account.id);

  const syncableItemIds = Array.from(
    new Set(
      selectedAccounts
        .filter((a) => a.is_automatic && a.pluggy_item_id)
        .map((a) => a.pluggy_item_id as string),
    ),
  );

  function handleSync() {
    setActionError(null);
    startSync(async () => {
      try {
        for (const itemId of syncableItemIds) {
          await syncPluggyItem(itemId);
        }
        clearSelection();
        router.refresh();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to sync.");
      }
    });
  }

  function setActive(ids: string[], isActive: boolean) {
    setActionError(null);
    startToggleActive(async () => {
      try {
        await setAccountsActive(ids, isActive);
        clearSelection();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  }

  const columnsByKey = new Map(COLUMNS.map((column) => [column.key, column]));
  const visibleColumns = columnOrder
    .map((key) => columnsByKey.get(key)!)
    .filter((column) => !hiddenColumns.has(column.key));

  const isBusy = isSyncing || isTogglingActive;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          ) : (
            <AddAccountMenu onError={setActionError} onConnected={() => router.refresh()} />
          )}
          {/* Only mounted while the selection includes at least one
              bank-connected account (one row or many); syncs each distinct
              Pluggy item among them. */}
          {syncableItemIds.length > 0 && (
            <Button
              variant="outline"
              size="icon-sm"
              disabled={isBusy}
              onClick={handleSync}
              aria-label="Sync"
              title="Sync"
            >
              <RefreshCwIcon className={isSyncing ? "animate-spin" : undefined} />
            </Button>
          )}
          {/* Sync stays in the toolbar above (explicit user request), so
              it's deliberately not also offered here. */}
          {selected.size > 0 && (
            <RowActionsMenu
              onEdit={soleSelectedRow ? () => setEditingAccount(soleSelectedRow) : undefined}
              onImport={soleSelectedRow ? () => setImportingAccount(soleSelectedRow) : undefined}
              onDeactivate={
                selectedAccounts.some((account) => account.is_active)
                  ? () => setActive(Array.from(selected), false)
                  : undefined
              }
              onActivate={
                selectedAccounts.some((account) => !account.is_active)
                  ? () => setActive(Array.from(selected), true)
                  : undefined
              }
              disabled={isBusy}
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

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No accounts yet. Add your first one to start tracking transactions.
        </p>
      ) : (
        <>
          {/* Phone: one card per account — name + type icon, then source
              icon + last update; balance on the right with the transactions total (Σ)
              under it. Tapping a card opens its edit dialog. */}
          <div className="flex flex-col gap-2 sm:hidden">
            <CardListHeader
              allSelected={allSelected}
              someSelected={someSelected}
              onToggleAll={toggleAll}
              selectAllLabel="Select all accounts"
              sortOptions={COLUMNS}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={(key, dir) => router.push(sortHref(key, dir))}
            />
            <ul className="flex flex-col divide-y rounded-lg border">
              {sorted.map((account) => (
                <li
                  key={account.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5",
                    !account.is_active && "text-muted-foreground",
                    selected.has(account.id) && "bg-muted",
                  )}
                >
                  <Checkbox
                    checked={selected.has(account.id)}
                    onCheckedChange={() => toggleOne(account.id)}
                    aria-label={`Select ${account.name}`}
                  />
                  <button
                    type="button"
                    onClick={() => setEditingAccount(account)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 truncate font-medium">{account.name}</span>
                        <AccountTypeIcon type={account.type} className="size-3.5" />
                        {!account.is_active && (
                          <Badge variant="outline" className="shrink-0">
                            Inactive
                          </Badge>
                        )}
                      </span>
                      <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex shrink-0 items-center gap-1">
                          <AccountSourceIcon account={account} className="size-3.5" />
                          {lastUpdateOf(account) && formatDateTime(lastUpdateOf(account)!)}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-medium">{formatCurrency(account.current_balance)}</span>
                      <span className="text-xs text-muted-foreground" title="Transactions total">
                        Σ {formatCurrency(transactionsTotalByAccount[account.id] ?? 0)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-0">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all accounts"
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
                {sorted.map((account) => (
                  <TableRow key={account.id} className={account.is_active ? "group" : "group text-muted-foreground"}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(account.id)}
                        onCheckedChange={() => toggleOne(account.id)}
                        aria-label={`Select ${account.name}`}
                        className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[checked]:opacity-100 pointer-coarse:opacity-100"
                      />
                    </TableCell>
                    {visibleColumns.map((column) => (
                      <TableCell key={column.key} className={column.cellClassName}>
                        {renderCell(account, column.key, transactionsTotalByAccount)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {importingAccount && (
        <ImportTransactionsDialog account={importingAccount} onClose={() => setImportingAccount(null)} />
      )}

      {editingAccount && (
        <Dialog open={editingAccount !== null} onOpenChange={(open) => !open && setEditingAccount(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit account</DialogTitle>
            </DialogHeader>
            <form
              id={`edit-account-${editingAccount.id}`}
              action={(formData) => {
                setActionError(null);
                startSaveEdit(async () => {
                  try {
                    await updateAccount(formData);
                    setEditingAccount(null);
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : "Failed to save account.");
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="id" value={editingAccount.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={editingAccount.name} required autoFocus />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="type">Type</Label>
                <Select name="type" defaultValue={editingAccount.type}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        <AccountTypeOptionLabel type={type} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  form={`edit-account-${editingAccount.id}`}
                  disabled={isSavingEdit}
                >
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
