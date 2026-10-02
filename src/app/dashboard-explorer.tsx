"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  ListTreeIcon,
} from "lucide-react";
import { DashboardTransactionsTable } from "./dashboard-transactions-table";
import { MONTH_LABELS, MonthlyBreakdownTable } from "./dashboard-monthly-table";
import { MonthsMenu } from "./dashboard-months-menu";
import {
  buildMonthlyBreakdown,
  buildMonthTotals,
  CLASSIFICATION_LEVEL_LABELS,
  DEFAULT_CLASSIFICATION_LEVELS,
  autonomyKey,
  monthIndex,
  TYPE_LABELS,
  type ClassificationLevel,
  type MonthlyRow,
  type MonthlySelection,
} from "./dashboard-monthly-breakdown";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ColumnsMenu } from "@/components/columns-menu";
import { AutonomyIcon } from "@/components/autonomy-icon";
import { CategoryIcon } from "@/components/category-icon";
import { useColumnPreferences } from "@/hooks/use-column-preferences";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { AUTONOMY_LABELS } from "@/lib/classification";
import { TRANSACTION_TYPE_SYMBOL_ROTATION, TRANSACTION_TYPE_SYMBOLS } from "@/lib/transaction-type";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const LEVEL_COLUMNS = DEFAULT_CLASSIFICATION_LEVELS.map((key) => ({ key, label: CLASSIFICATION_LEVEL_LABELS[key] }));

// Month indexes as string keys, so the Months menu can reuse
// useColumnPreferences' per-browser hidden set (its order is unused —
// months always stay in calendar order).
const MONTH_KEYS = Array.from({ length: 12 }, (_, i) => String(i));

// Keys of every row that has children, at any depth — what "expand all" opens.
function expandableKeys(rows: MonthlyRow[]): string[] {
  return rows.flatMap((row) =>
    row.children && row.children.length > 0 ? [row.key, ...expandableKeys(row.children)] : [],
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

// What a selection covers, in the dynamic table's own vocabulary: symbols
// only (type arrow, padlock, category/class icon), names as tooltips, then
// the month — or the year number for a whole-year selection.
function SelectionLabel({
  year,
  selection,
  categoriesById,
  classesById,
}: {
  year: number;
  selection: MonthlySelection;
  categoriesById: Map<string, Category>;
  classesById: Map<string, Class>;
}) {
  const category = selection.categoryId ? categoriesById.get(selection.categoryId) : undefined;
  const selectedClass = selection.classId ? classesById.get(selection.classId) : undefined;
  return (
    <span className="flex items-center gap-2">
      {selection.kind === "uncategorized" && <span>Uncategorized</span>}
      {selection.kind && selection.kind !== "uncategorized" && (
        <span
          title={TYPE_LABELS[selection.kind]}
          className={cn(
            "inline-flex w-4 justify-center text-muted-foreground",
            TRANSACTION_TYPE_SYMBOL_ROTATION[selection.kind],
          )}
        >
          {TRANSACTION_TYPE_SYMBOLS[selection.kind]}
        </span>
      )}
      {selection.autonomy && (
        <span title={AUTONOMY_LABELS[selection.autonomy]} className="inline-flex">
          <AutonomyIcon autonomy={selection.autonomy} className="size-4" />
        </span>
      )}
      {category && (
        <span title={category.name} className="inline-flex">
          <CategoryIcon icon={category.icon} className="size-4" />
        </span>
      )}
      {selectedClass && (
        <span title={selectedClass.name} className="inline-flex">
          <CategoryIcon icon={selectedClass.icon} className="size-4" />
        </span>
      )}
      <span className="capitalize">{selection.month === undefined ? year : MONTH_LABELS[selection.month]}</span>
    </span>
  );
}

function monthlySelectionsEqual(a: MonthlySelection, b: MonthlySelection) {
  return (
    a.kind === b.kind &&
    a.autonomy === b.autonomy &&
    a.categoryId === b.categoryId &&
    a.classId === b.classId &&
    a.month === b.month
  );
}

export function DashboardExplorer({
  year,
  transactions,
  accounts,
  categories,
  classes,
}: {
  year: number;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  classes: Class[];
}) {
  const [selection, setSelection] = useState<MonthlySelection | undefined>(undefined);
  const isMobile = useIsMobile();
  // Phones show one month column at a time (plus Year), stepped with the
  // arrows, instead of the Months menu's set. Only read on phones, which
  // never server-render this branch, so the client clock is safe here.
  const [phoneMonth, setPhoneMonth] = useState(() => new Date().getMonth());
  // The phone stepper walks months across year boundaries (Jan ‹ goes to
  // the previous year's Dez). Changing year is a navigation, so the target
  // month waits here until the new year's data arrives, then applies.
  const router = useRouter();
  const [pendingStep, setPendingStep] = useState<{ year: number; month: number } | null>(null);
  if (pendingStep && pendingStep.year === year) {
    setPhoneMonth(pendingStep.month);
    setPendingStep(null);
  }

  function stepPhoneMonth(delta: -1 | 1) {
    const next = phoneMonth + delta;
    if (next >= 0 && next <= 11) {
      setPhoneMonth(next);
      return;
    }
    const target = { year: year + delta, month: next < 0 ? 11 : 0 };
    setPendingStep(target);
    router.push(`/?year=${target.year}`);
  }

  const stepperMonth = pendingStep?.month ?? phoneMonth;
  const { hidden: hiddenLevels, order: levelOrder, toggle: toggleLevel, move: moveLevel } =
    useColumnPreferences<ClassificationLevel>("dashboard-monthly-table-levels-v2", DEFAULT_CLASSIFICATION_LEVELS);
  const levels = useMemo(
    () => levelOrder.filter((level) => !hiddenLevels.has(level)),
    [levelOrder, hiddenLevels],
  );

  const { hidden: hiddenMonthKeys, toggle: toggleMonthKey } = useColumnPreferences(
    "dashboard-monthly-table-months",
    MONTH_KEYS,
  );
  const hiddenMonths = useMemo(() => new Set(Array.from(hiddenMonthKeys, Number)), [hiddenMonthKeys]);
  const visibleMonths = useMemo(
    () => MONTH_KEYS.map(Number).filter((month) => !hiddenMonths.has(month)),
    [hiddenMonths],
  );

  function setAllMonths(visible: boolean) {
    // toggle() uses a functional state update, so toggling several in a row composes.
    for (const key of MONTH_KEYS) {
      if (hiddenMonthKeys.has(key) === visible) toggleMonthKey(key);
    }
  }

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const classesById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

  const monthlyBreakdown = useMemo(
    () => buildMonthlyBreakdown(transactions, categories, classes, levels),
    [transactions, categories, classes, levels],
  );
  const monthTotals = useMemo(() => buildMonthTotals(transactions), [transactions]);

  // Starts fully collapsed (only the Type rows); see dashboard-monthly-table.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const allKeys = useMemo(() => expandableKeys(monthlyBreakdown), [monthlyBreakdown]);
  const allExpanded = allKeys.length > 0 && allKeys.every((key) => expanded.has(key));

  function toggleRow(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSelect(value: MonthlySelection) {
    setSelection((prev) => (prev && monthlySelectionsEqual(prev, value) ? undefined : value));
  }

  const filteredTransactions = useMemo(() => {
    if (!selection) return [];

    const { kind, autonomy, categoryId, classId, month } = selection;
    return transactions.filter((t) => {
      if (month !== undefined && monthIndex(t.date) !== month) return false;
      const category = t.category_id ? categoriesById.get(t.category_id) : undefined;
      if (kind === "uncategorized" && category) return false;
      if (kind && kind !== "uncategorized" && category?.kind !== kind) return false;
      if (autonomy && autonomyKey(t, classesById) !== autonomy) return false;
      if (categoryId && category?.id !== categoryId) return false;
      if (classId && t.class_id !== classId) return false;
      return true;
    });
  }, [selection, transactions, categoriesById, classesById]);

  const filteredTotal = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const transactionsTable = (
    <DashboardTransactionsTable
      transactions={filteredTransactions}
      accounts={accounts}
      categories={categories}
      classes={classes}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end gap-2">
        {isMobile && (
          <div className="mr-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => stepPhoneMonth(-1)}
              disabled={pendingStep !== null}
              aria-label="Previous month"
              title="Previous month"
            >
              <ChevronLeftIcon />
            </Button>
            <span
              className={cn(
                "w-12 text-center text-base font-medium capitalize",
                pendingStep && "text-muted-foreground",
              )}
            >
              {/* Month only — the table's year-total column header names the year. */}
              {MONTH_LABELS[stepperMonth]}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => stepPhoneMonth(1)}
              disabled={pendingStep !== null}
              aria-label="Next month"
              title="Next month"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        )}
        <Button
          variant="outline"
          size="icon-sm"
          disabled={allKeys.length === 0}
          onClick={() => setExpanded(allExpanded ? new Set() : new Set(allKeys))}
          aria-label={allExpanded ? "Collapse all levels" : "Expand all levels"}
          title={allExpanded ? "Collapse all levels" : "Expand all levels"}
        >
          {allExpanded ? <ChevronsDownUpIcon /> : <ChevronsUpDownIcon />}
        </Button>
        {!isMobile && (
          <MonthsMenu hidden={hiddenMonths} onToggle={(month) => toggleMonthKey(String(month))} onSetAll={setAllMonths} />
        )}
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
      <MonthlyBreakdownTable
        year={year}
        rows={monthlyBreakdown}
        monthTotals={monthTotals}
        visibleMonths={isMobile ? [phoneMonth] : visibleMonths}
        selected={selection}
        onSelect={handleSelect}
        expanded={expanded}
        onToggle={toggleRow}
      />

      {/* Phones: the filtered transactions open in a bottom sheet, since
          inline they'd land below the fold and the tap would seem to do
          nothing. Closing the sheet clears the selection. */}
      {selection && isMobile && (
        <Dialog open onOpenChange={(open) => !open && setSelection(undefined)}>
          <DialogContent className="top-auto bottom-0 left-0 max-h-[85dvh] max-w-none translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none rounded-t-xl pb-[max(1rem,env(safe-area-inset-bottom))]">
            <DialogHeader className="pr-8">
              <DialogTitle>
                <SelectionLabel year={year} selection={selection} categoriesById={categoriesById} classesById={classesById} />
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {filteredTransactions.length === 1 ? "1 transaction" : `${filteredTransactions.length} transactions`}
                {" · "}
                <span className={cn("font-medium", filteredTotal >= 0 ? "text-emerald-600" : "text-foreground")}>
                  {formatCurrency(filteredTotal)}
                </span>
              </p>
            </DialogHeader>
            {transactionsTable}
          </DialogContent>
        </Dialog>
      )}
      {selection && !isMobile && transactionsTable}
    </div>
  );
}
