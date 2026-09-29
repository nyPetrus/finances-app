import type { Category } from "@/lib/supabase/types";

// The up/down/transfer arrow shown for each type — next to each Type row in
// the Dashboard's monthly breakdown table (dashboard-monthly-breakdown.ts)
// and in Categories' Type column. All three use the same heavy "➔" glyph,
// rotated via TRANSACTION_TYPE_SYMBOL_ROTATION for income/expense, so they
// share one visual weight — "↑"/"↓" come from Inter and render much thinner
// than "➔" (a symbol-font fallback) even in bold, and there's no heavy
// up/down counterpart to "➔" in Unicode.
export const TRANSACTION_TYPE_SYMBOLS: Record<Category["kind"], string> = {
  income: "➔",
  expense: "➔",
  transfer: "➔",
};

// Applied to the symbol's wrapper, which must be inline-block/inline-flex
// (CSS transforms don't apply to plain inline elements).
export const TRANSACTION_TYPE_SYMBOL_ROTATION: Record<Category["kind"], string> = {
  income: "-rotate-90",
  expense: "rotate-90",
  transfer: "",
};
