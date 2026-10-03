"use client";

import { useMemo, useState } from "react";
import { TransactionsTable } from "@/components/transactions-table";
import type { SortKey } from "@/lib/transaction-sort";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";

// The Dashboard's click-to-filter panel: the shared TransactionsTable over
// the explorer's already-filtered rows, sorted here in local state (a URL
// sort would navigate away from the filtered view). Dates drop the year —
// the Dashboard is always one year — and rows are one step smaller.
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
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedTransactions = useMemo(() => {
    const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
    const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
    const classNames = new Map(classes.map((c) => [c.id, c.name]));
    return [...transactions].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "date":
          cmp = a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at);
          break;
        case "description":
          cmp = a.description.localeCompare(b.description);
          break;
        case "account":
          cmp = (accountNames.get(a.account_id) ?? "").localeCompare(accountNames.get(b.account_id) ?? "");
          break;
        case "category":
          cmp = ((a.category_id && categoryNames.get(a.category_id)) || "").localeCompare(
            (b.category_id && categoryNames.get(b.category_id)) || "",
          );
          break;
        case "class":
          cmp = ((a.class_id && classNames.get(a.class_id)) || "").localeCompare(
            (b.class_id && classNames.get(b.class_id)) || "",
          );
          break;
        case "amount":
          cmp = a.amount - b.amount;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [transactions, accounts, categories, classes, sortKey, sortDir]);

  return (
    <TransactionsTable
      transactions={sortedTransactions}
      accounts={accounts}
      categories={categories}
      classes={classes}
      sortKey={sortKey}
      sortDir={sortDir}
      onSortChange={(key, dir) => {
        setSortKey(key);
        setSortDir(dir);
      }}
      columnsStorageKey="dashboard-transactions-table"
      showYear={false}
      compactRows
    />
  );
}
