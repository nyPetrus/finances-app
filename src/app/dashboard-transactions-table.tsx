"use client";

import { useMemo, useState } from "react";
import { TransactionsTable } from "@/components/transactions-table";
import { sortTransactions, type SortKey } from "@/lib/transaction-sort";
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

  const sortedTransactions = useMemo(
    () => sortTransactions(transactions, sortKey, sortDir, { accounts, categories, classes }),
    [transactions, accounts, categories, classes, sortKey, sortDir],
  );

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
