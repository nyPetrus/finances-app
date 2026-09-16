"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DashboardTransactionsTable } from "./dashboard-transactions-table";
import { MonthlyBreakdownTable } from "./dashboard-monthly-table";
import { monthIndex, type MonthlyRow, type MonthlySelection } from "./dashboard-monthly-breakdown";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";

type StatKey = "income" | "expenses" | "balance" | "accounts" | "transfers" | "uncategorized";

// Either a stat card or a click on the monthly breakdown table drives the
// same embedded transactions table below — only one can be active at a
// time, same as the stat cards used to be on their own.
type Selection = { source: "stat"; stat: StatKey } | { source: "monthly"; value: MonthlySelection };

function monthlySelectionsEqual(a: MonthlySelection, b: MonthlySelection) {
  return a.kind === b.kind && a.categoryId === b.categoryId && a.classId === b.classId && a.month === b.month;
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
      <CardContent className={cn("text-base font-semibold", colorClassName)}>
        {value === 0 ? "-" : formatCurrency(value)}
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
  monthlyBreakdown,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  classes: Class[];
  stats: Record<StatKey, number>;
  monthlyBreakdown: MonthlyRow[];
}) {
  const [selection, setSelection] = useState<Selection | undefined>(undefined);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  function handleSelectStat(stat: StatKey) {
    setSelection((prev) => (prev?.source === "stat" && prev.stat === stat ? undefined : { source: "stat", stat }));
  }

  function handleSelectMonthly(value: MonthlySelection) {
    setSelection((prev) =>
      prev?.source === "monthly" && monthlySelectionsEqual(prev.value, value)
        ? undefined
        : { source: "monthly", value },
    );
  }

  const filteredTransactions = useMemo(() => {
    if (!selection) return [];

    if (selection.source === "stat") {
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
    }

    const { kind, categoryId, classId, month } = selection.value;
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

  const balanceColor =
    stats.balance > 0 ? "text-emerald-600" : stats.balance < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          title="Income"
          value={stats.income}
          colorClassName="text-emerald-600"
          selected={selection?.source === "stat" && selection.stat === "income"}
          onClick={() => handleSelectStat("income")}
        />
        <StatCard
          title="Expenses"
          value={stats.expenses}
          colorClassName="text-destructive"
          selected={selection?.source === "stat" && selection.stat === "expenses"}
          onClick={() => handleSelectStat("expenses")}
        />
        <StatCard
          title="Balance"
          value={stats.balance}
          colorClassName={balanceColor}
          selected={selection?.source === "stat" && selection.stat === "balance"}
          onClick={() => handleSelectStat("balance")}
        />
        <StatCard
          title="Accounts"
          value={stats.accounts}
          selected={selection?.source === "stat" && selection.stat === "accounts"}
          onClick={() => handleSelectStat("accounts")}
        />
        <StatCard
          title="Transfers"
          value={stats.transfers}
          selected={selection?.source === "stat" && selection.stat === "transfers"}
          onClick={() => handleSelectStat("transfers")}
        />
        <StatCard
          title="Uncategorized"
          value={stats.uncategorized}
          selected={selection?.source === "stat" && selection.stat === "uncategorized"}
          onClick={() => handleSelectStat("uncategorized")}
        />
      </div>

      <MonthlyBreakdownTable
        rows={monthlyBreakdown}
        selected={selection?.source === "monthly" ? selection.value : undefined}
        onSelect={handleSelectMonthly}
      />

      {selection ? (
        <DashboardTransactionsTable
          transactions={filteredTransactions}
          accounts={accounts}
          categories={categories}
          classes={classes}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Click a card or a cell in the table above to filter transactions.</p>
      )}
    </div>
  );
}
