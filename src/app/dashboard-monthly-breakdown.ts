import type { Category, Class, Gordura, Transaction } from "@/lib/supabase/types";
import { effectiveGordura, GORDURA_LABELS } from "@/lib/classification";
import { TRANSACTION_TYPE_SYMBOLS } from "@/lib/transaction-type";

// Thin alias kept for callers in this file and dashboard-explorer.tsx —
// effectiveGordura() is always a concrete Gordura now (never "unset"), so
// there's no longer a "none"/"Sem gordura" bucket to map onto.
export const gorduraKey = effectiveGordura;

const GORDURA_ORDER: Gordura[] = ["low", "high"];

// The three optional breakdown levels below the always-present Type level.
// The Dashboard's "Levels" menu (dashboard-explorer.tsx) lets the user
// include/exclude and reorder these freely, backed by the same
// useColumnPreferences hook the rest of the app uses for table columns.
// Type itself is never one of these — it's always level 1, static.
export type ClassificationLevel = "gordura" | "category" | "class";

export const CLASSIFICATION_LEVEL_LABELS: Record<ClassificationLevel, string> = {
  gordura: "Gordura",
  category: "Category",
  class: "Class",
};

export const DEFAULT_CLASSIFICATION_LEVELS: ClassificationLevel[] = ["gordura", "category", "class"];

// Feeds MonthlyBreakdownTable (dashboard-monthly-table.tsx): a Type + however
// many of the configured levels tree, one row per node, each carrying its own
// 12 monthly sums plus a year total. A node is only included if at least one
// transaction actually falls under it — an all-zero category (say, a Class
// whose two transactions happen to net to zero) still gets a row, but a
// category with literally no transactions this year does not, so expanding
// a row never reveals an empty list.
export type MonthlyRow = {
  key: string;
  label: string;
  icon?: string;
  symbol?: string;
  level: "type" | ClassificationLevel;
  kind: Category["kind"] | "uncategorized";
  gordura?: Gordura;
  categoryId?: string;
  classId?: string;
  months: number[];
  total: number;
  children?: MonthlyRow[];
};

// Identifies what a click on the table (dashboard-monthly-table.tsx) should
// filter the embedded transactions table down to. `kind: undefined` means
// "any type" (a month-column click); every field undefined means "the whole
// year, no restriction at all" (a Total-column click).
export type MonthlySelection = {
  kind?: Category["kind"] | "uncategorized";
  gordura?: Gordura;
  categoryId?: string;
  classId?: string;
  month?: number;
};

const TYPE_LABELS: Record<Category["kind"], string> = {
  income: "Income",
  expense: "Expenses",
  transfer: "Transfers",
};

const TYPE_ORDER: Category["kind"][] = ["income", "expense", "transfer"];

function emptyMonths(): number[] {
  return Array(12).fill(0);
}

function sum(months: number[]) {
  return months.reduce((a, b) => a + b, 0);
}

export function monthIndex(date: string) {
  return Number(date.slice(5, 7)) - 1;
}

// Biggest amount first — expense totals are negative (see
// amount-color-conventions), so sort by magnitude rather than raw value,
// which would otherwise put the smallest expense on top.
const byMagnitude = (a: MonthlyRow, b: MonthlyRow) => Math.abs(b.total) - Math.abs(a.total);

type LevelSelection = Pick<MonthlySelection, "gordura" | "categoryId" | "classId">;

// Buckets `transactions` by one level. A transaction with no value for this
// level (e.g. no class_id when level is "class") is left out of every
// bucket — its amount still counts toward the parent node's own months/total
// (computed independently below, not derived from children), it just gets
// no child row of its own. Category is the one exception that never drops a
// transaction: by the time this runs, transactions with no category at all
// have already been split off into the "Uncategorized" Type row.
function bucketBy(level: ClassificationLevel, transactions: Transaction[], categoriesById: Map<string, Category>, classesById: Map<string, Class>) {
  const buckets = new Map<string, { label: string; icon?: string; selection: LevelSelection; transactions: Transaction[] }>();

  for (const transaction of transactions) {
    let id: string;
    let label: string;
    let icon: string | undefined;
    let selection: LevelSelection;

    if (level === "gordura") {
      const gordura = gorduraKey(transaction, classesById);
      id = gordura;
      label = GORDURA_LABELS[gordura];
      selection = { gordura };
    } else if (level === "category") {
      const category = transaction.category_id ? categoriesById.get(transaction.category_id) : undefined;
      if (!category) continue;
      id = category.id;
      label = category.name;
      icon = category.icon;
      selection = { categoryId: category.id };
    } else {
      const classItem = transaction.class_id ? classesById.get(transaction.class_id) : undefined;
      if (!classItem) continue;
      id = classItem.id;
      label = classItem.name;
      selection = { classId: classItem.id };
    }

    if (!buckets.has(id)) buckets.set(id, { label, icon, selection, transactions: [] });
    buckets.get(id)!.transactions.push(transaction);
  }

  return [...buckets.entries()].map(([id, bucket]) => ({ id, ...bucket }));
}

function buildLevelRows(
  transactions: Transaction[],
  levels: ClassificationLevel[],
  levelIndex: number,
  kind: Category["kind"],
  keyPrefix: string,
  selectionSoFar: LevelSelection,
  categoriesById: Map<string, Category>,
  classesById: Map<string, Class>,
): MonthlyRow[] {
  if (levelIndex >= levels.length) return [];
  const level = levels[levelIndex];
  const buckets = bucketBy(level, transactions, categoriesById, classesById);

  const rows: MonthlyRow[] = buckets.map((bucket) => {
    const key = `${keyPrefix}:${level}:${bucket.id}`;
    const selection = { ...selectionSoFar, ...bucket.selection };
    const months = emptyMonths();
    for (const t of bucket.transactions) months[monthIndex(t.date)] += t.amount;
    const children = buildLevelRows(
      bucket.transactions,
      levels,
      levelIndex + 1,
      kind,
      key,
      selection,
      categoriesById,
      classesById,
    );

    return {
      key,
      label: bucket.label,
      icon: bucket.icon,
      level,
      kind,
      ...selection,
      months,
      total: sum(months),
      children: children.length > 0 ? children : undefined,
    };
  });

  if (level === "gordura") {
    rows.sort((a, b) => GORDURA_ORDER.indexOf(a.gordura!) - GORDURA_ORDER.indexOf(b.gordura!));
  } else {
    rows.sort(byMagnitude);
  }
  return rows;
}

export function buildMonthlyBreakdown(
  transactions: Transaction[],
  categories: Category[],
  classes: Class[],
  levels: ClassificationLevel[] = DEFAULT_CLASSIFICATION_LEVELS,
): MonthlyRow[] {
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const classesById = new Map(classes.map((c) => [c.id, c]));

  const byType = new Map<Category["kind"], Transaction[]>(TYPE_ORDER.map((kind) => [kind, []]));
  const uncategorized: Transaction[] = [];

  for (const transaction of transactions) {
    const category = transaction.category_id ? categoriesById.get(transaction.category_id) : undefined;
    if (!category) {
      uncategorized.push(transaction);
      continue;
    }
    byType.get(category.kind)!.push(transaction);
  }

  const rows: MonthlyRow[] = TYPE_ORDER.map((kind) => {
    const kindTransactions = byType.get(kind)!;
    const months = emptyMonths();
    // Unlike the Transfers stat card (which sums magnitude — see
    // dashboard-conventions — so a transfer's two legs across the user's
    // own accounts don't net toward zero), this table sums the signed
    // amount as-is: a 150 transfer out and a 150 transfer in should net to
    // 0 here, per explicit user request.
    for (const t of kindTransactions) months[monthIndex(t.date)] += t.amount;

    const children = buildLevelRows(kindTransactions, levels, 0, kind, `type:${kind}`, {}, categoriesById, classesById);

    return {
      key: `type:${kind}`,
      label: TYPE_LABELS[kind],
      symbol: TRANSACTION_TYPE_SYMBOLS[kind],
      level: "type",
      kind,
      months,
      total: sum(months),
      children: children.length > 0 ? children : undefined,
    };
  });

  if (uncategorized.length > 0) {
    const months = emptyMonths();
    for (const t of uncategorized) months[monthIndex(t.date)] += t.amount;
    rows.push({
      key: "type:uncategorized",
      label: "Uncategorized",
      level: "type",
      kind: "uncategorized",
      months,
      total: sum(months),
    });
  }

  return rows;
}
