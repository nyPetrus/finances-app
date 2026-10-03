"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TransactionsTable } from "@/components/transactions-table";
import type { SortKey } from "@/lib/transaction-sort";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";
import { SyncButton } from "../descriptions/sync-button";

// Search's results: the shared TransactionsTable, sorted by the server via
// `?sort=&dir=` (the rows arrive already in that order).
export function SearchTable({
  transactions,
  accounts,
  categories,
  classes,
  sortKey,
  sortDir,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  classes: Class[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Preserves every active filter param already in the URL — only sort/dir
  // change, so clicking a column header never drops the applied search.
  function sortHref(column: SortKey, dir: "asc" | "desc") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", column);
    params.set("dir", dir);
    return `/search?${params.toString()}`;
  }

  return (
    <TransactionsTable
      transactions={transactions}
      accounts={accounts}
      categories={categories}
      classes={classes}
      sortKey={sortKey}
      sortDir={sortDir}
      sortHref={sortHref}
      onSortChange={(key, dir) => router.push(sortHref(key, dir))}
      columnsStorageKey="search-table"
      showYear
      emptyMessage="No transactions match these filters."
      toolbarExtra={<SyncButton />}
    />
  );
}
