"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableTableHead } from "@/components/sortable-table-head";
import type { Account } from "@/lib/supabase/types";
import { deleteAccounts } from "./actions";
import { syncPluggyItem } from "./pluggy-actions";
import { EditAccountDialog } from "./edit-account-dialog";
import { type SortKey } from "./sort";

const typeLabels: Record<Account["type"], string> = {
  checking: "Checking",
  investment: "Investment",
  fgts: "FGTS",
  manual: "Manual",
  credit_card: "Credit card",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSyncing, startSync] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  function sortHref(column: SortKey) {
    const nextDir: "asc" | "desc" = sortKey === column && sortDir === "asc" ? "desc" : "asc";
    return `/accounts?${new URLSearchParams({ sort: column, dir: nextDir }).toString()}`;
  }

  const sorted = useMemo(() => {
    return [...accounts].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "institution":
          cmp = (a.institution ?? "").localeCompare(b.institution ?? "");
          break;
        case "type":
          cmp = typeLabels[a.type].localeCompare(typeLabels[b.type]);
          break;
        case "source":
          cmp = Number(a.is_automatic) - Number(b.is_automatic);
          break;
        case "balance":
          cmp = a.current_balance - b.current_balance;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [accounts, sortKey, sortDir]);

  const allSelected = sorted.length > 0 && selected.size === sorted.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(sorted.map((a) => a.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedAccounts = sorted.filter((a) => selected.has(a.id));
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
        setSelected(new Set());
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
        setSelected(new Set());
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to delete.");
      }
    });
  }

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No accounts yet. Add your first one to start tracking transactions.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {selected.size > 0 ? `${selected.size} selected` : "Select accounts to sync or delete"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={syncableItemIds.length === 0 || isSyncing || isDeleting}
            onClick={handleSync}
          >
            {isSyncing ? "Syncing…" : "Sync"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={selected.size === 0 || isSyncing || isDeleting}
            onClick={handleDelete}
          >
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
                aria-label="Select all accounts"
              />
            </TableHead>
            <SortableTableHead href={sortHref("name")} active={sortKey === "name"} dir={sortDir}>
              Name
            </SortableTableHead>
            <SortableTableHead href={sortHref("institution")} active={sortKey === "institution"} dir={sortDir}>
              Institution
            </SortableTableHead>
            <SortableTableHead href={sortHref("type")} active={sortKey === "type"} dir={sortDir}>
              Type
            </SortableTableHead>
            <SortableTableHead href={sortHref("source")} active={sortKey === "source"} dir={sortDir}>
              Source
            </SortableTableHead>
            <SortableTableHead
              href={sortHref("balance")}
              active={sortKey === "balance"}
              dir={sortDir}
              align="right"
            >
              Balance
            </SortableTableHead>
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
              <TableCell className="font-medium">
                {account.is_automatic ? account.name : <EditAccountDialog account={account} />}
              </TableCell>
              <TableCell>{account.institution ?? "—"}</TableCell>
              <TableCell>{typeLabels[account.type]}</TableCell>
              <TableCell>
                <Badge variant={account.is_automatic ? "default" : "secondary"}>
                  {account.is_automatic ? "Automatic" : "Manual"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{formatCurrency(account.current_balance)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
