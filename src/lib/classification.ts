import type { Category, Class, Gordura, Transaction } from "@/lib/supabase/types";

export const GORDURA_LABELS: Record<Gordura, string> = {
  high: "Alta",
  low: "Baixa",
};

export function isGordura(value: unknown): value is Gordura {
  return value === "high" || value === "low";
}

// A transaction's own gordura is only a manual override; without one it
// inherits its class's default (see migration 0018).
export function effectiveGordura(
  transaction: Pick<Transaction, "gordura" | "class_id">,
  classesById: Map<string, Class>,
): Gordura | null {
  if (transaction.gordura) return transaction.gordura;
  return transaction.class_id ? (classesById.get(transaction.class_id)?.default_gordura ?? null) : null;
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
