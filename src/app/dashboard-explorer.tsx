"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DashboardTransactionsTable } from "./dashboard-transactions-table";
import { MonthlyBreakdownTable } from "./dashboard-monthly-table";
import type { MonthlyRow } from "./dashboard-monthly-breakdown";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";

type StatKey = "income" | "expenses" | "balance" | "accounts" | "transfers" | "uncategorized";

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
  monthlyBreakdown,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  classes: Class[];
  stats: Record<StatKey, number>;
  monthlyBreakdown: MonthlyRow[];
}) {
  const [selectedStat, setSelectedStat] = useState<StatKey | undefined>(undefined);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  function handleSelect(stat: StatKey) {
    setSelectedStat((prev) => (prev === stat ? undefined : stat));
  }

  const filteredTransactions = useMemo(() => {
    if (!selectedStat) return [];

    switch (selectedStat) {
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
  }, [selectedStat, transactions, categoriesById]);

  const balanceColor =
    stats.balance > 0 ? "text-emerald-600" : stats.balance < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          title="Income"
          value={stats.income}
          colorClassName="text-emerald-600"
          selected={selectedStat === "income"}
          onClick={() => handleSelect("income")}
        />
        <StatCard
          title="Expenses"
          value={stats.expenses}
          colorClassName="text-destructive"
          selected={selectedStat === "expenses"}
          onClick={() => handleSelect("expenses")}
        />
        <StatCard
          title="Balance"
          value={stats.balance}
          colorClassName={balanceColor}
          selected={selectedStat === "balance"}
          onClick={() => handleSelect("balance")}
        />
        <StatCard
          title="Accounts"
          value={stats.accounts}
          selected={selectedStat === "accounts"}
          onClick={() => handleSelect("accounts")}
        />
        <StatCard
          title="Transfers"
          value={stats.transfers}
          selected={selectedStat === "transfers"}
          onClick={() => handleSelect("transfers")}
        />
        <StatCard
          title="Uncategorized"
          value={stats.uncategorized}
          selected={selectedStat === "uncategorized"}
          onClick={() => handleSelect("uncategorized")}
        />
      </div>

      <MonthlyBreakdownTable rows={monthlyBreakdown} />

      {selectedStat ? (
        <DashboardTransactionsTable
          transactions={filteredTransactions}
          accounts={accounts}
          categories={categories}
          classes={classes}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Click a card above to filter transactions.</p>
      )}
    </div>
  );
}
