"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CategoryBarChart } from "./category-bar-chart";
import { ExpensesByMonthChart } from "./expenses-by-month-chart";
import { DashboardTransactionsTable } from "./dashboard-transactions-table";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";

type ChartEntry = { key: string; name: string; amount: number; color: string };

type StatKey = "income" | "expenses" | "balance" | "accounts" | "transfers" | "uncategorized";

type Selection =
  | { kind: "stat"; stat: StatKey }
  | { kind: "category"; group: "expense"; key: string }
  | { kind: "month"; month: number };

function selectionId(selection: Selection): string {
  switch (selection.kind) {
    case "stat":
      return `stat:${selection.stat}`;
    case "category":
      return `category:${selection.group}:${selection.key}`;
    case "month":
      return `month:${selection.month}`;
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function StatCard({
  title,
  value,
  colorClassName,
  selected,
  onClick,
}: {
  title: string;
  value: number;
  colorClassName?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "cursor-pointer transition-shadow hover:ring-foreground/25",
        selected && "ring-2 ring-primary",
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className={cn("text-xl font-semibold", colorClassName)}>
        {formatCurrency(value)}
      </CardContent>
    </Card>
  );
}

export function DashboardExplorer({
  transactions,
  accounts,
  categories,
  classes,
  stats,
  monthlyData,
  expensesData,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  classes: Class[];
  stats: Record<StatKey, number>;
  monthlyData: { month: string; expenses: number }[];
  expensesData: ChartEntry[];
}) {
  const [selection, setSelection] = useState<Selection | undefined>(undefined);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  function handleSelect(next: Selection) {
    setSelection((prev) => (prev && selectionId(prev) === selectionId(next) ? undefined : next));
  }

  const filteredTransactions = useMemo(() => {
    if (!selection) return [];

    if (selection.kind === "category") {
      const { key } = selection;
      return transactions.filter((t) => {
        const matchesKey = key === "uncategorized" ? !t.category_id : t.category_id === key;
        if (!matchesKey) return false;
        const category = t.category_id ? categoriesById.get(t.category_id) : null;
        return t.amount < 0 && category?.kind !== "transfer";
      });
    }

    if (selection.kind === "month") {
      return transactions.filter((t) => {
        if (Number(t.date.slice(5, 7)) - 1 !== selection.month) return false;
        const category = t.category_id ? categoriesById.get(t.category_id) : null;
        return category?.kind === "expense";
      });
    }

    switch (selection.stat) {
      case "income":
        return transactions.filter((t) => {
          const category = t.category_id ? categoriesById.get(t.category_id) : null;
          return category?.kind === "income";
        });
      case "expenses":
        return transactions.filter((t) => {
          const category = t.category_id ? categoriesById.get(t.category_id) : null;
          return category?.kind === "expense";
        });
      case "balance":
        return transactions.filter((t) => {
          const category = t.category_id ? categoriesById.get(t.category_id) : null;
          return category?.kind === "income" || category?.kind === "expense";
        });
      case "transfers":
        return transactions.filter((t) => {
          const category = t.category_id ? categoriesById.get(t.category_id) : null;
          return category?.kind === "transfer";
        });
      case "uncategorized":
        return transactions.filter((t) => !t.category_id);
      case "accounts":
        return transactions;
    }
  }, [selection, transactions, categoriesById]);

  const balanceColor =
    stats.balance > 0 ? "text-emerald-600" : stats.balance < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          title="Income"
          value={stats.income}
          colorClassName="text-emerald-600"
          selected={selection?.kind === "stat" && selection.stat === "income"}
          onClick={() => handleSelect({ kind: "stat", stat: "income" })}
        />
        <StatCard
          title="Expenses"
          value={stats.expenses}
          colorClassName="text-destructive"
          selected={selection?.kind === "stat" && selection.stat === "expenses"}
          onClick={() => handleSelect({ kind: "stat", stat: "expenses" })}
        />
        <StatCard
          title="Balance"
          value={stats.balance}
          colorClassName={balanceColor}
          selected={selection?.kind === "stat" && selection.stat === "balance"}
          onClick={() => handleSelect({ kind: "stat", stat: "balance" })}
        />
        <StatCard
          title="Accounts"
          value={stats.accounts}
          selected={selection?.kind === "stat" && selection.stat === "accounts"}
          onClick={() => handleSelect({ kind: "stat", stat: "accounts" })}
        />
        <StatCard
          title="Transfers"
          value={stats.transfers}
          selected={selection?.kind === "stat" && selection.stat === "transfers"}
          onClick={() => handleSelect({ kind: "stat", stat: "transfers" })}
        />
        <StatCard
          title="Uncategorized"
          value={stats.uncategorized}
          selected={selection?.kind === "stat" && selection.stat === "uncategorized"}
          onClick={() => handleSelect({ kind: "stat", stat: "uncategorized" })}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expenses by month</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpensesByMonthChart
            data={monthlyData}
            selectedMonth={selection?.kind === "month" ? selection.month : undefined}
            onSelect={(month) => handleSelect({ kind: "month", month })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {expensesData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses yet.</p>
          ) : (
            <CategoryBarChart
              data={expensesData}
              selectedKey={selection?.kind === "category" && selection.group === "expense" ? selection.key : undefined}
              onSelect={(key) => handleSelect({ kind: "category", group: "expense", key })}
            />
          )}
        </CardContent>
      </Card>

      {selection ? (
        <DashboardTransactionsTable
          transactions={filteredTransactions}
          accounts={accounts}
          categories={categories}
          classes={classes}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Click a card or bar above to filter transactions.</p>
      )}
    </div>
  );
}
