import type { Category, Class, Autonomy, Transaction } from "@/lib/supabase/types";
import { effectiveAutonomy, AUTONOMY_LABELS } from "@/lib/classification";
import { TRANSACTION_TYPE_SYMBOLS } from "@/lib/transaction-type";

// Thin alias kept for callers in this file and dashboard-explorer.tsx —
// effectiveAutonomy() is always a concrete Autonomy now (never "unset"), so
// there's no longer a "none"/"unset" bucket to map onto.
export const autonomyKey = effectiveAutonomy;

const AUTONOMY_ORDER: Autonomy[] = ["low", "high"];


// The breakdown levels. The Dashboard's "Levels" menu
// (dashboard-explorer.tsx) lets the user include/exclude and reorder all of
// them freely — Type included — backed by the same useColumnPreferences hook
// the rest of the app uses for table columns.
export type ClassificationLevel = "type" | "autonomy" | "category" | "class";

export const CLASSIFICATION_LEVEL_LABELS: Record<ClassificationLevel, string> = {
  type: "Type",
  autonomy: "Autonomy",
  category: "Category",
  class: "Class",
};

export const DEFAULT_CLASSIFICATION_LEVELS: ClassificationLevel[] = ["type", "autonomy", "category", "class"];

// Feeds MonthlyBreakdownTable (dashboard-monthly-table.tsx): a tree of
// however many of the configured levels, one row per node, each carrying its own
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
  level: ClassificationLevel;
  // Set on a Type row and everything below it; undefined on rows above
  // the Type level (or everywhere, when Type is excluded).
  kind?: Category["kind"] | "uncategorized";
  autonomy?: Autonomy;
  categoryId?: string;
  classId?: string;
  months: number[];
  total: number;
  children?: MonthlyRow[];
};

// Identifies what a click on the table (dashboard-monthly-table.tsx) should
// filter the embedded transactions table down to. Each defined field
// narrows independently; with none of kind/autonomy/categoryId/classId set
// it's a column-wide click (header/footer: `month` only, or `{}` for the
// whole year).
export type MonthlySelection = {
  kind?: Category["kind"] | "uncategorized";
  autonomy?: Autonomy;
  categoryId?: string;
  classId?: string;
  month?: number;
};

export const TYPE_LABELS: Record<Category["kind"], string> = {
  income: "Income",
  expense: "Expenses",
  transfer: "Transfers",
};

const TYPE_ORDER: (Category["kind"] | "uncategorized")[] = ["income", "expense", "transfer", "uncategorized"];

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

type LevelSelection = Pick<MonthlySelection, "kind" | "autonomy" | "categoryId" | "classId">;

// Buckets `transactions` by one level. A transaction with no value for this
// level (e.g. no class_id when level is "class") is left out of every
// bucket — its amount still counts toward the parent node's own months/total
// (computed independently below, not derived from children), it just gets
// no child row of its own. Type and Autonomy never drop a transaction: Type
// puts category-less transactions into its own "Uncategorized" bucket.
function bucketBy(level: ClassificationLevel, transactions: Transaction[], categoriesById: Map<string, Category>, classesById: Map<string, Class>) {
  const buckets = new Map<
    string,
    { label: string; icon?: string; symbol?: string; selection: LevelSelection; transactions: Transaction[] }
  >();

  for (const transaction of transactions) {
    let id: string;
    let label: string;
    let icon: string | undefined;
    let symbol: string | undefined;
    let selection: LevelSelection;

    if (level === "type") {
      const category = transaction.category_id ? categoriesById.get(transaction.category_id) : undefined;
      if (category) {
        id = category.kind;
        label = TYPE_LABELS[category.kind];
        symbol = TRANSACTION_TYPE_SYMBOLS[category.kind];
        selection = { kind: category.kind };
      } else {
        id = "uncategorized";
        label = "Uncategorized";
        selection = { kind: "uncategorized" };
      }
    } else if (level === "autonomy") {
      const autonomy = autonomyKey(transaction, classesById);
      id = autonomy;
      label = AUTONOMY_LABELS[autonomy];
      selection = { autonomy };
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
      icon = classItem.icon;
      selection = { classId: classItem.id };
    }

    if (!buckets.has(id)) buckets.set(id, { label, icon, symbol, selection, transactions: [] });
    buckets.get(id)!.transactions.push(transaction);
  }

  return [...buckets.entries()].map(([id, bucket]) => ({ id, ...bucket }));
}

function buildLevelRows(
  transactions: Transaction[],
  levels: ClassificationLevel[],
  levelIndex: number,
  keyPrefix: string,
  selectionSoFar: LevelSelection,
  categoriesById: Map<string, Category>,
  classesById: Map<string, Class>,
): MonthlyRow[] {
  if (levelIndex >= levels.length) return [];
  const level = levels[levelIndex];
  const buckets = bucketBy(level, transactions, categoriesById, classesById);

  const rows: MonthlyRow[] = buckets.map((bucket) => {
    const key = keyPrefix ? `${keyPrefix}:${level}:${bucket.id}` : `${level}:${bucket.id}`;
    const selection = { ...selectionSoFar, ...bucket.selection };
    const months = emptyMonths();
    for (const t of bucket.transactions) months[monthIndex(t.date)] += t.amount;
    // Uncategorized stays a leaf, wherever the Type level sits.
    const children =
      level === "type" && bucket.id === "uncategorized"
        ? []
        : buildLevelRows(bucket.transactions, levels, levelIndex + 1, key, selection, categoriesById, classesById);

    return {
      key,
      label: bucket.label,
      icon: bucket.icon,
      symbol: bucket.symbol,
      level,
      ...selection,
      months,
      total: sum(months),
      children: children.length > 0 ? children : undefined,
    };
  });

  if (level === "type") {
    rows.sort((a, b) => TYPE_ORDER.indexOf(a.kind!) - TYPE_ORDER.indexOf(b.kind!));
  } else if (level === "autonomy") {
    rows.sort((a, b) => AUTONOMY_ORDER.indexOf(a.autonomy!) - AUTONOMY_ORDER.indexOf(b.autonomy!));
  } else {
    rows.sort(byMagnitude);
  }
  return rows;
}

// Every kind, Transfer included, sums the signed amount as-is: a 150
// transfer out and a 150 transfer in net to 0 here, per explicit user
// request.
export function buildMonthlyBreakdown(
  transactions: Transaction[],
  categories: Category[],
  classes: Class[],
  levels: ClassificationLevel[] = DEFAULT_CLASSIFICATION_LEVELS,
): MonthlyRow[] {
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const classesById = new Map(classes.map((c) => [c.id, c]));
  return buildLevelRows(transactions, levels, 0, "", {}, categoriesById, classesById);
}

// Column sums straight from the transactions, not from the top-level rows —
// a Category or Class top level drops transactions without one, so summing
// its rows would understate the footer.
export function buildMonthTotals(transactions: Transaction[]): number[] {
  const months = emptyMonths();
  for (const t of transactions) months[monthIndex(t.date)] += t.amount;
  return months;
}
