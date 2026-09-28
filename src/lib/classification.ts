import type { Category, Class, Gordura, Transaction } from "@/lib/supabase/types";

export const GORDURA_LABELS: Record<Gordura, string> = {
  high: "Alta",
  low: "Baixa",
};

// Per explicit user request, gordura *displays* show just the symbol (name
// as a hover tooltip): the Dashboard dynamic table, the Classes table, the
// Search filter chip. Pickers (dropdowns, checkbox lists) use
// gorduraOptionLabel — symbol + name — so the choice stays unambiguous.
export const GORDURA_SYMBOLS: Record<Gordura, string> = {
  low: "▢",
  high: "△",
};

export function gorduraOptionLabel(gordura: Gordura): string {
  return `${GORDURA_SYMBOLS[gordura]} ${GORDURA_LABELS[gordura]}`;
}

// The ultimate fallback when neither the transaction nor its class specifies
// one — per explicit user request. Before this, a transaction with no
// override and a class with no default (or no class at all) showed as
// "unset"/"Sem gordura"; now it resolves to Alta, same as any other
// still-uncategorized-for-gordura transaction would going forward. See
// classes/actions.ts's updateClass for how a class's own default changing
// still doesn't retroactively change an already-existing transaction.
export const DEFAULT_GORDURA: Gordura = "high";

export function isGordura(value: unknown): value is Gordura {
  return value === "high" || value === "low";
}

// A transaction's effective gordura: its own override, else its class's
// default, else DEFAULT_GORDURA — always a concrete value, never "unset"
// (see migration 0018 for the override column).
export function effectiveGordura(
  transaction: Pick<Transaction, "gordura" | "class_id">,
  classesById: Map<string, Class>,
): Gordura {
  if (transaction.gordura) return transaction.gordura;
  const classDefault = transaction.class_id ? classesById.get(transaction.class_id)?.default_gordura : null;
  return classDefault ?? DEFAULT_GORDURA;
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
