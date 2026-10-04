import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";

export const SORT_KEYS = ["date", "description", "account", "category", "class", "amount", "balance"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export function isSortKey(value: string | undefined): value is SortKey {
  return !!value && (SORT_KEYS as readonly string[]).includes(value);
}

// The one ordering rule for transaction tables — Search sorts its results
// with it on the server, the Dashboard's panel in the browser. Names sort
// by the account/category/class name; a missing balance sorts lowest.
export function sortTransactions(
  transactions: Transaction[],
  sortKey: SortKey,
  sortDir: "asc" | "desc",
  { accounts, categories, classes }: { accounts: Account[]; categories: Category[]; classes: Class[] },
): Transaction[] {
  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const classNames = new Map(classes.map((c) => [c.id, c.name]));
  const nameOf = (names: Map<string, string>, id: string | null) => (id && names.get(id)) || "";

  return [...transactions].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at);
        break;
      case "description":
        cmp = a.description.localeCompare(b.description);
        break;
      case "account":
        cmp = nameOf(accountNames, a.account_id).localeCompare(nameOf(accountNames, b.account_id));
        break;
      case "category":
        cmp = nameOf(categoryNames, a.category_id).localeCompare(nameOf(categoryNames, b.category_id));
        break;
      case "class":
        cmp = nameOf(classNames, a.class_id).localeCompare(nameOf(classNames, b.class_id));
        break;
      case "amount":
        cmp = a.amount - b.amount;
        break;
      case "balance":
        cmp = (a.balance ?? -Infinity) - (b.balance ?? -Infinity);
        if (Number.isNaN(cmp)) cmp = 0; // both missing
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
}
