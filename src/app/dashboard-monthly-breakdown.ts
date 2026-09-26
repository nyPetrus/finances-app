import type { Category, Class, Gordura, Transaction } from "@/lib/supabase/types";
import { effectiveGordura, GORDURA_LABELS } from "@/lib/classification";
import { TRANSACTION_TYPE_SYMBOLS } from "@/lib/transaction-type";

// A transaction's effective gordura (see effectiveGordura), with "none" for
// one that has neither an override nor a class default — kept as its own
// branch so no amount drops out of the tree.
export type GorduraKey = Gordura | "none";

export function gorduraKey(
  transaction: Pick<Transaction, "gordura" | "class_id">,
  classesById: Map<string, Class>,
): GorduraKey {
  return effectiveGordura(transaction, classesById) ?? "none";
}

const GORDURA_ORDER: GorduraKey[] = ["high", "low", "none"];
const GORDURA_KEY_LABELS: Record<GorduraKey, string> = { ...GORDURA_LABELS, none: "Sem gordura" };

// Feeds MonthlyBreakdownTable (dashboard-monthly-table.tsx): a Type/Gordura/
// Category/Class tree, one row per node, each carrying its own 12 monthly
// sums plus a year total. A node is only included if at least one
// transaction actually falls under it — an all-zero category (say, a Class
// whose two transactions happen to net to zero) still gets a row, but a
// category with literally no transactions this year does not, so expanding
// a row never reveals an empty list.
export type MonthlyRow = {
  key: string;
  label: string;
  icon?: string;
  symbol?: string;
  kind: Category["kind"] | "uncategorized";
  gordura?: GorduraKey;
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
  gordura?: GorduraKey;
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

function addTo(map: Map<string, number[]>, key: string, month: number, value: number) {
  if (!map.has(key)) map.set(key, emptyMonths());
  map.get(key)![month] += value;
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

  // Gordura sits between Type and Category, and is per transaction (a manual
  // override can differ from its class default), so one category can appear
  // under more than one gordura. Sums below Type are therefore keyed by
  // `${gordura}|${categoryId}` rather than by category alone.
  const gorduraMonths = new Map<string, number[]>(); // `${kind}|${gordura}`
  const categoryMonths = new Map<string, number[]>(); // `${gordura}|${categoryId}`
  // A class can be reused across categories, so class sums are kept per
  // gordura+category: `${gordura}|${categoryId}` -> classId -> months.
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

    const gordura = gorduraKey(transaction, classesById);
    addTo(gorduraMonths, `${category.kind}|${gordura}`, month, value);

    const categoryKey = `${gordura}|${category.id}`;
    addTo(categoryMonths, categoryKey, month, value);

    if (transaction.class_id) {
      if (!classMonths.has(categoryKey)) classMonths.set(categoryKey, new Map());
      addTo(classMonths.get(categoryKey)!, transaction.class_id, month, value);
    }
  }

  // Biggest amount first — expense totals are negative (see
  // amount-color-conventions), so sort by magnitude rather than raw value,
  // which would otherwise put the smallest expense on top.
  const byMagnitude = (a: MonthlyRow, b: MonthlyRow) => Math.abs(b.total) - Math.abs(a.total);

  const rows: MonthlyRow[] = TYPE_ORDER.map((kind) => {
    const gorduraRows: MonthlyRow[] = GORDURA_ORDER.filter((gordura) => gorduraMonths.has(`${kind}|${gordura}`)).map(
      (gordura) => {
        const categoryRows: MonthlyRow[] = categories
          .filter((category) => category.kind === kind && categoryMonths.has(`${gordura}|${category.id}`))
          .map((category) => {
            const categoryKey = `${gordura}|${category.id}`;
            const months = categoryMonths.get(categoryKey)!;
            const classRows: MonthlyRow[] = [...(classMonths.get(categoryKey) ?? new Map<string, number[]>())]
              .filter(([classId]) => classesById.has(classId))
              .map(([classId, classItemMonths]) => {
                const classItem = classesById.get(classId)!;
                return {
                  key: `class:${gordura}:${category.id}:${classItem.id}`,
                  label: classItem.name,
                  kind,
                  gordura,
                  categoryId: category.id,
                  classId: classItem.id,
                  months: classItemMonths,
                  total: sum(classItemMonths),
                };
              })
              .sort(byMagnitude);

            return {
              key: `category:${gordura}:${category.id}`,
              label: category.name,
              icon: category.icon,
              kind,
              gordura,
              categoryId: category.id,
              months,
              total: sum(months),
              children: classRows.length > 0 ? classRows : undefined,
            };
          })
          .sort(byMagnitude);

        const months = gorduraMonths.get(`${kind}|${gordura}`)!;
        return {
          key: `gordura:${kind}:${gordura}`,
          label: GORDURA_KEY_LABELS[gordura],
          kind,
          gordura,
          months,
          total: sum(months),
          children: categoryRows.length > 0 ? categoryRows : undefined,
        };
      },
    );

    return {
      key: `type:${kind}`,
      label: TYPE_LABELS[kind],
      symbol: TRANSACTION_TYPE_SYMBOLS[kind],
      kind,
      months: typeMonths[kind],
      total: sum(typeMonths[kind]),
      children: gorduraRows.length > 0 ? gorduraRows : undefined,
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
