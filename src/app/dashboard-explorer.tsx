"use client";

import { useMemo, useState } from "react";
import { DashboardTransactionsTable } from "./dashboard-transactions-table";
import { MonthlyBreakdownTable } from "./dashboard-monthly-table";
import { monthIndex, type MonthlyRow, type MonthlySelection } from "./dashboard-monthly-breakdown";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";

function monthlySelectionsEqual(a: MonthlySelection, b: MonthlySelection) {
  return a.kind === b.kind && a.categoryId === b.categoryId && a.classId === b.classId && a.month === b.month;
}

export function DashboardExplorer({
  transactions,
  accounts,
  categories,
  classes,
  monthlyBreakdown,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  classes: Class[];
  monthlyBreakdown: MonthlyRow[];
}) {
  const [selection, setSelection] = useState<MonthlySelection | undefined>(undefined);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  function handleSelect(value: MonthlySelection) {
    setSelection((prev) => (prev && monthlySelectionsEqual(prev, value) ? undefined : value));
  }

  const filteredTransactions = useMemo(() => {
    if (!selection) return [];

    const { kind, categoryId, classId, month } = selection;
    return transactions.filter((t) => {
      if (month !== undefined && monthIndex(t.date) !== month) return false;
      if (kind === undefined) return true;
      if (kind === "uncategorized") return !t.category_id;
      const category = t.category_id ? categoriesById.get(t.category_id) : undefined;
      if (!category || category.kind !== kind) return false;
      if (categoryId && category.id !== categoryId) return false;
      if (classId && t.class_id !== classId) return false;
      return true;
    });
  }, [selection, transactions, categoriesById]);

  return (
    <div className="flex flex-col gap-6">
      <MonthlyBreakdownTable rows={monthlyBreakdown} selected={selection} onSelect={handleSelect} />

      {selection ? (
        <DashboardTransactionsTable
          transactions={filteredTransactions}
          accounts={accounts}
          categories={categories}
          classes={classes}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Click a cell in the table above to filter transactions.</p>
      )}
    </div>
  );
}
