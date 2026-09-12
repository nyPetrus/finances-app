"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryBarChart } from "./category-bar-chart";
import { DashboardTransactionsTable } from "./dashboard-transactions-table";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";

type ChartEntry = { key: string; name: string; amount: number; color: string };

export function DashboardCategoryExplorer({
  transactions,
  accounts,
  categories,
  classes,
  expensesData,
  incomeData,
  transferData,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  classes: Class[];
  expensesData: ChartEntry[];
  incomeData: ChartEntry[];
  transferData: ChartEntry[];
}) {
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const expenseKeys = useMemo(() => new Set(expensesData.map((e) => e.key)), [expensesData]);
  const incomeKeys = useMemo(() => new Set(incomeData.map((e) => e.key)), [incomeData]);
  const transferKeys = useMemo(() => new Set(transferData.map((e) => e.key)), [transferData]);

  function handleSelect(key: string) {
    setSelected((prev) => (prev === key ? undefined : key));
  }

  const filteredTransactions = useMemo(() => {
    if (!selected) return [];

    function matchesCategory(transaction: Transaction) {
      return selected === "uncategorized"
        ? !transaction.category_id
        : transaction.category_id === selected;
    }

    if (expenseKeys.has(selected)) {
      return transactions.filter((t) => {
        if (t.amount >= 0 || !matchesCategory(t)) return false;
        const category = t.category_id ? categoriesById.get(t.category_id) : null;
        return category?.kind !== "transfer";
      });
    }
    if (incomeKeys.has(selected)) {
      return transactions.filter((t) => {
        if (t.amount <= 0 || !matchesCategory(t)) return false;
        const category = t.category_id ? categoriesById.get(t.category_id) : null;
        return category?.kind !== "transfer";
      });
    }
    if (transferKeys.has(selected)) {
      return transactions.filter((t) => {
        const category = t.category_id ? categoriesById.get(t.category_id) : null;
        return category?.kind === "transfer" && matchesCategory(t);
      });
    }
    return [];
  }, [selected, transactions, categoriesById, expenseKeys, incomeKeys, transferKeys]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="md:row-span-2">
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses yet.</p>
            ) : (
              <CategoryBarChart data={expensesData} selectedKey={selected} onSelect={handleSelect} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Income</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No income yet.</p>
            ) : (
              <CategoryBarChart data={incomeData} selectedKey={selected} onSelect={handleSelect} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transfer</CardTitle>
          </CardHeader>
          <CardContent>
            {transferData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transfers yet.</p>
            ) : (
              <CategoryBarChart data={transferData} selectedKey={selected} onSelect={handleSelect} />
            )}
          </CardContent>
        </Card>
      </div>

      {selected ? (
        <DashboardTransactionsTable
          transactions={filteredTransactions}
          accounts={accounts}
          categories={categories}
          classes={classes}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Click a bar above to filter transactions.</p>
      )}
    </div>
  );
}
