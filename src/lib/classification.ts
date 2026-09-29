import { LockIcon, createLucideIcon, type LucideIcon } from "lucide-react";
import type { Category, Class, Autonomy, Transaction } from "@/lib/supabase/types";

export const AUTONOMY_LABELS: Record<Autonomy, string> = {
  high: "Alta",
  low: "Baixa",
};

// Per explicit user request, autonomy *displays* show just the symbol (name
// as a hover tooltip): the Dashboard dynamic table, the Categories & Classes
// table, the Search filter chip. Pickers (dropdowns, checkbox lists) show
// symbol + name (AutonomyOptionLabel) so the choice stays unambiguous.
// Padlocks per explicit user request (were ▢ / △): Baixa = locked in,
// Alta = free. Render via AutonomyIcon (src/components/autonomy-icon.tsx).
// Lucide's lock-open swings its shackle open to the right; per explicit user
// request Alta's opens to the left instead, so this is that icon mirrored
// (same rect, shackle path reflected across x = 12).
const LockOpenLeftIcon = createLucideIcon("lock-open-left", [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "lock-open-left-body" }],
  ["path", { d: "M17 11V7a5 5 0 0 0-9.9-1", key: "lock-open-left-shackle" }],
]);

export const AUTONOMY_ICONS: Record<Autonomy, LucideIcon> = {
  low: LockIcon,
  high: LockOpenLeftIcon,
};

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
