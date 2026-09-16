import type { Category } from "@/lib/supabase/types";

// Shared between the Types page (src/app/types) and the Dashboard's monthly
// breakdown table, which both display transaction types (Category["kind"])
// identified by a symbol instead of a lucide icon.
export const TRANSACTION_TYPE_ORDER: Category["kind"][] = ["income", "expense", "transfer"];

export const TRANSACTION_TYPE_SYMBOLS: Record<Category["kind"], string> = {
  income: "↑",
  expense: "↓",
  transfer: "⇄",
};

export const TRANSACTION_TYPE_LABELS: Record<Category["kind"], string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};
