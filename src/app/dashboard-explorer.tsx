"use client";

import { useMemo, useState } from "react";
import { ListTreeIcon } from "lucide-react";
import { DashboardTransactionsTable } from "./dashboard-transactions-table";
import { MonthlyBreakdownTable } from "./dashboard-monthly-table";
import {
  buildMonthlyBreakdown,
  CLASSIFICATION_LEVEL_LABELS,
  DEFAULT_CLASSIFICATION_LEVELS,
  gorduraKey,
  monthIndex,
  type ClassificationLevel,
  type MonthlySelection,
} from "./dashboard-monthly-breakdown";
import { ColumnsMenu } from "@/components/columns-menu";
import { useColumnPreferences } from "@/hooks/use-column-preferences";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";

const LEVEL_COLUMNS = DEFAULT_CLASSIFICATION_LEVELS.map((key) => ({ key, label: CLASSIFICATION_LEVEL_LABELS[key] }));

function monthlySelectionsEqual(a: MonthlySelection, b: MonthlySelection) {
  return (
    a.kind === b.kind &&
    a.gordura === b.gordura &&
    a.categoryId === b.categoryId &&
    a.classId === b.classId &&
    a.month === b.month
  );
}

export function DashboardExplorer({
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
  const [selection, setSelection] = useState<MonthlySelection | undefined>(undefined);
  const { hidden: hiddenLevels, order: levelOrder, toggle: toggleLevel, move: moveLevel } =
    useColumnPreferences<ClassificationLevel>("dashboard-monthly-table-levels", DEFAULT_CLASSIFICATION_LEVELS);
  const levels = useMemo(
    () => levelOrder.filter((level) => !hiddenLevels.has(level)),
    [levelOrder, hiddenLevels],
  );

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const classesById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

  const monthlyBreakdown = useMemo(
    () => buildMonthlyBreakdown(transactions, categories, classes, levels),
    [transactions, categories, classes, levels],
  );

  function handleSelect(value: MonthlySelection) {
    setSelection((prev) => (prev && monthlySelectionsEqual(prev, value) ? undefined : value));
  }

  const filteredTransactions = useMemo(() => {
    if (!selection) return [];

    const { kind, gordura, categoryId, classId, month } = selection;
    return transactions.filter((t) => {
      if (month !== undefined && monthIndex(t.date) !== month) return false;
      if (kind === undefined) return true;
      if (kind === "uncategorized") return !t.category_id;
      const category = t.category_id ? categoriesById.get(t.category_id) : undefined;
      if (!category || category.kind !== kind) return false;
      if (gordura && gorduraKey(t, classesById) !== gordura) return false;
      if (categoryId && category.id !== categoryId) return false;
      if (classId && t.class_id !== classId) return false;
      return true;
    });
  }, [selection, transactions, categoriesById, classesById]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <ColumnsMenu
          columns={LEVEL_COLUMNS}
          order={levelOrder}
          hidden={hiddenLevels}
          onToggle={toggleLevel}
          onMove={moveLevel}
          label="Levels"
          icon={<ListTreeIcon />}
        />
      </div>
      <MonthlyBreakdownTable rows={monthlyBreakdown} selected={selection} onSelect={handleSelect} />

      {selection && (
        <DashboardTransactionsTable
          transactions={filteredTransactions}
          accounts={accounts}
          categories={categories}
          classes={classes}
        />
      )}
    </div>
  );
}
