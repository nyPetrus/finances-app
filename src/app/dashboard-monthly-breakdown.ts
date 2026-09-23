import type { Category, Class, Transaction } from "@/lib/supabase/types";
import { TRANSACTION_TYPE_SYMBOLS } from "@/lib/transaction-type";

// Feeds MonthlyBreakdownTable (dashboard-monthly-table.tsx): a Type/Category/
// Class tree, one row per node, each carrying its own 12 monthly sums plus a
// year total. A node is only included if at least one transaction actually
// falls under it — an all-zero category (say, a Class whose two transactions
// happen to net to zero) still gets a row, but a category with literally no
// transactions this year does not, so "+" never expands into an empty list.
export type MonthlyRow = {
  key: string;
  label: string;
  icon?: string;
  symbol?: string;
  kind: Category["kind"] | "uncategorized";
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

export function buildMonthlyBreakdown(
  transactions: Transaction[],
  categories: Category[],
  classes: Class[],
): MonthlyRow[] {
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const classesById = new Map(classes.map((c) => [c.id, c]));

  const typeMonths: Record<Category["kind"] | "uncategorized", number[]> = {
    income: emptyMonths(),
    expense: emptyMonths(),
    transfer: emptyMonths(),
    uncategorized: emptyMonths(),
  };
  let uncategorizedCount = 0;

  const categoryMonths = new Map<string, number[]>();
  // A class can be reused across categories, so class sums are kept per
  // category: categoryId -> classId -> months.
  const classMonths = new Map<string, Map<string, number[]>>();

  for (const transaction of transactions) {
    const month = monthIndex(transaction.date);
    const category = transaction.category_id ? categoriesById.get(transaction.category_id) : undefined;

    if (!category) {
      typeMonths.uncategorized[month] += transaction.amount;
      uncategorizedCount += 1;
      continue;
    }

    // Unlike the Transfers stat card (which sums magnitude — see
    // dashboard-conventions — so a transfer's two legs across the user's
    // own accounts don't net toward zero), this table sums the signed
    // amount as-is: a 150 transfer out and a 150 transfer in should net to
    // 0 here, per explicit user request.
    const value = transaction.amount;

    typeMonths[category.kind][month] += value;

    if (!categoryMonths.has(category.id)) categoryMonths.set(category.id, emptyMonths());
    categoryMonths.get(category.id)![month] += value;

    if (transaction.class_id) {
      if (!classMonths.has(category.id)) classMonths.set(category.id, new Map());
      const byClass = classMonths.get(category.id)!;
      if (!byClass.has(transaction.class_id)) byClass.set(transaction.class_id, emptyMonths());
      byClass.get(transaction.class_id)![month] += value;
    }
  }

  const rows: MonthlyRow[] = TYPE_ORDER.map((kind) => {
    const categoryRows: MonthlyRow[] = categories
      .filter((category) => category.kind === kind && categoryMonths.has(category.id))
      .map((category) => {
        const months = categoryMonths.get(category.id)!;
        const classRows: MonthlyRow[] = [...(classMonths.get(category.id) ?? new Map<string, number[]>())]
          .filter(([classId]) => classesById.has(classId))
          .map(([classId, classItemMonths]) => {
            const classItem = classesById.get(classId)!;
            return {
              key: `class:${category.id}:${classItem.id}`,
              label: classItem.name,
              kind,
              categoryId: category.id,
              classId: classItem.id,
              months: classItemMonths,
              total: sum(classItemMonths),
            };
          })
          // Biggest amount first — expense totals are negative (see
          // amount-color-conventions), so sort by magnitude rather than raw
          // value, which would otherwise put the smallest expense on top.
          .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

        return {
          key: `category:${category.id}`,
          label: category.name,
          icon: category.icon,
          kind,
          categoryId: category.id,
          months,
          total: sum(months),
          children: classRows.length > 0 ? classRows : undefined,
        };
      })
      // Same magnitude-desc rule as the Class rows above.
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    return {
      key: `type:${kind}`,
      label: TYPE_LABELS[kind],
      symbol: TRANSACTION_TYPE_SYMBOLS[kind],
      kind,
      months: typeMonths[kind],
      total: sum(typeMonths[kind]),
      children: categoryRows.length > 0 ? categoryRows : undefined,
    };
  });

  if (uncategorizedCount > 0) {
    rows.push({
      key: "type:uncategorized",
      label: "Uncategorized",
      kind: "uncategorized",
      months: typeMonths.uncategorized,
      total: sum(typeMonths.uncategorized),
    });
  }

  return rows;
}
