import type { Category } from "@/lib/supabase/types";

// The up/down/transfer arrow shown next to each Type row's name in the
// Dashboard's monthly breakdown table (dashboard-monthly-breakdown.ts).
export const TRANSACTION_TYPE_SYMBOLS: Record<Category["kind"], string> = {
  income: "↑",
  expense: "↓",
  transfer: "⇄",
};
