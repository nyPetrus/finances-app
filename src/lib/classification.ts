import type { Category, Class, Autonomy, Transaction } from "@/lib/supabase/types";

export const AUTONOMY_LABELS: Record<Autonomy, string> = {
  high: "Alta",
  low: "Baixa",
};

// Per explicit user request, autonomy *displays* show just the symbol (name
// as a hover tooltip): the Dashboard dynamic table, the Classes table, the
// Search filter chip. Pickers (dropdowns, checkbox lists) use
// autonomyOptionLabel — symbol + name — so the choice stays unambiguous.
export const AUTONOMY_SYMBOLS: Record<Autonomy, string> = {
  low: "▢",
  high: "△",
};

export function autonomyOptionLabel(autonomy: Autonomy): string {
  return `${AUTONOMY_SYMBOLS[autonomy]} ${AUTONOMY_LABELS[autonomy]}`;
}

// The ultimate fallback when neither the transaction nor its class specifies
// one — per explicit user request. Before this, a transaction with no
// override and a class with no default (or no class at all) showed as
// "unset"/"unset"; now it resolves to Alta, same as any other
// still-uncategorized-for-autonomy transaction would going forward. See
// classes/actions.ts's updateClass for how a class's own default changing
// still doesn't retroactively change an already-existing transaction.
export const DEFAULT_AUTONOMY: Autonomy = "high";

export function isAutonomy(value: unknown): value is Autonomy {
  return value === "high" || value === "low";
}

// A transaction's effective autonomy: its own override, else its class's
// default, else DEFAULT_AUTONOMY — always a concrete value, never "unset"
// (see migration 0018 for the override column).
export function effectiveAutonomy(
  transaction: Pick<Transaction, "autonomy" | "class_id">,
  classesById: Map<string, Class>,
): Autonomy {
  if (transaction.autonomy) return transaction.autonomy;
  const classDefault = transaction.class_id ? classesById.get(transaction.class_id)?.autonomy : null;
  return classDefault ?? DEFAULT_AUTONOMY;
}

// Categories to offer in a picker: active ones, plus the currently selected
// one even if it has since been deactivated, so editing an old row doesn't
// silently drop its category.
export function pickableCategories(categories: Category[], currentId: string | null) {
  return categories.filter((category) => category.is_active || category.id === currentId);
}

// Classes linked to `categoryId`, active only — plus the current one, same
// reasoning as pickableCategories.
export function pickableClasses(classes: Class[], categoryId: string | null, currentId: string | null) {
  if (!categoryId) return [];
  return classes.filter(
    (classItem) =>
      classItem.category_ids.includes(categoryId) && (classItem.is_active || classItem.id === currentId),
  );
}
