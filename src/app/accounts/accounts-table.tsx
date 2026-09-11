"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
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
import type { Account } from "@/lib/supabase/types";
import { deleteAccounts, updateAccount } from "./actions";
import { AddAccountDialog } from "./add-account-dialog";
import { syncPluggyItem } from "./pluggy-actions";
import { type SortKey } from "./sort";

const typeLabels: Record<Account["type"], string> = {
  checking: "Checking",
  investment: "Investment",
  fgts: "FGTS",
  manual: "Manual",
  credit_card: "Credit card",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

const COLUMNS: {
  key: SortKey;
  label: string;
  align?: "right" | "center";
  cellClassName?: string;
}[] = [
  { key: "account", label: "Account" },
  { key: "name", label: "Name", cellClassName: "font-medium" },
  { key: "source", label: "Source", align: "center", cellClassName: "text-center" },
  { key: "type", label: "Type", align: "center", cellClassName: "text-center" },
  { key: "lastSync", label: "Last sync", align: "center", cellClassName: "text-center" },
  { key: "balance", label: "Balance", align: "right", cellClassName: "text-right" },
];

const DEFAULT_COLUMN_ORDER = COLUMNS.map((column) => column.key);

function renderCell(account: Account, key: SortKey) {
  switch (key) {
    case "account":
      return account.label ?? <span className="text-sm text-muted-foreground">—</span>;
    case "name":
      return account.name;
    case "source":
      return account.source ?? "—";
    case "type":
      return typeLabels[account.type];
    case "lastSync":
      return account.is_automatic ? (
        formatDateTime(account.updated_at)
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      );
    case "balance":
      return formatCurrency(account.current_balance);
  }
}

export function AccountsTable({
  accounts,
  sortKey,
  sortDir,
}: {
  accounts: Account[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
}) {
  const router = useRouter();
  const [isSyncing, startSync] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [isSavingEdit, startSaveEdit] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { hidden: hiddenColumns, order: columnOrder, toggle: toggleColumn, move: moveColumn } =
    useColumnPreferences<SortKey>("accounts-table", DEFAULT_COLUMN_ORDER);

  function sortHref(column: SortKey) {
    const nextDir: "asc" | "desc" = sortKey === column && sortDir === "asc" ? "desc" : "asc";
    return `/accounts?${new URLSearchParams({ sort: column, dir: nextDir }).toString()}`;
  }

  const sorted = useMemo(() => {
    return [...accounts].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "account":
          cmp = (a.label ?? "").localeCompare(b.label ?? "");
          break;
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "source":
          cmp = (a.source ?? "").localeCompare(b.source ?? "");
          break;
        case "type":
          cmp = typeLabels[a.type].localeCompare(typeLabels[b.type]);
          break;
        case "lastSync":
          cmp = a.updated_at.localeCompare(b.updated_at);
          break;
        case "balance":
          cmp = a.current_balance - b.current_balance;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [accounts, sortKey, sortDir]);

  const {
    selected,
    allSelected,
    someSelected,
    toggleAll,
    toggleOne,
    clear: clearSelection,
    selectedRows: selectedAccounts,
    soleSelectedRow: soleSelectedAccount,
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

  function handleDelete() {
    if (selected.size === 0) return;
    const label = selected.size === 1 ? "this account" : `these ${selected.size} accounts`;
    if (!window.confirm(`Delete ${label}? This will also delete all of their transactions.`)) {
      return;
    }
    setActionError(null);
    startDelete(async () => {
      try {
        await deleteAccounts(Array.from(selected));
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
        {selected.size > 0 && (
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ColumnsMenu columns={COLUMNS} order={columnOrder} hidden={hiddenColumns} onToggle={toggleColumn} onMove={moveColumn} />
          <Button
            variant="outline"
            size="icon-sm"
            disabled={syncableItemIds.length === 0 || isSyncing || isDeleting}
            onClick={handleSync}
            aria-label="Sync"
            title="Sync"
          >
            <RefreshCwIcon className={isSyncing ? "animate-spin" : undefined} />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!soleSelectedAccount || isSyncing || isDeleting}
            onClick={() => setEditDialogOpen(true)}
            aria-label="Edit"
            title="Edit"
          >
            <PencilIcon />
          </Button>
          <AddAccountDialog />
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={selected.size === 0 || isSyncing || isDeleting}
            onClick={handleDelete}
            aria-label="Delete"
            title="Delete"
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No accounts yet. Add your first one to start tracking transactions.
        </p>
      ) : (
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
                  {column.label}
                </SortableTableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(account.id)}
                    onCheckedChange={() => toggleOne(account.id)}
                    aria-label={`Select ${account.name}`}
                  />
                </TableCell>
                {visibleColumns.map((column) => (
                  <TableCell key={column.key} className={column.cellClassName}>
                    {renderCell(account, column.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {soleSelectedAccount && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit account</DialogTitle>
            </DialogHeader>
            <form
              id={`edit-account-${soleSelectedAccount.id}`}
              action={(formData) => {
                setActionError(null);
                startSaveEdit(async () => {
                  try {
                    await updateAccount(formData);
                    setEditDialogOpen(false);
                    clearSelection();
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : "Failed to save account.");
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="id" value={soleSelectedAccount.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="label">Account</Label>
                <Input
                  id="label"
                  name="label"
                  placeholder="Short label for this account"
                  defaultValue={soleSelectedAccount.label ?? ""}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={soleSelectedAccount.name} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="type">Type</Label>
                <Select name="type" defaultValue={soleSelectedAccount.type}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="fgts">FGTS</SelectItem>
                    <SelectItem value="credit_card">Credit card</SelectItem>
                    <SelectItem value="manual">Manual / Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  form={`edit-account-${soleSelectedAccount.id}`}
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
