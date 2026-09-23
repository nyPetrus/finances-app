import type { SupabaseClient } from "@supabase/supabase-js";

// Postgres foreign_key_violation — raised when a delete would orphan rows
// that still reference the target (see migration 0018).
const FOREIGN_KEY_VIOLATION = "23503";

export type DeleteResult = {
  // User-facing summary of what couldn't be deleted, or null if everything was.
  error: string | null;
  // Rows skipped because something still references them — candidates for
  // "deactivate instead".
  inUseIds: string[];
};

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

async function countReferences(supabase: SupabaseClient, table: string, column: string, id: string) {
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true }).eq(column, id);
  return count ?? 0;
}

async function describeUsage(supabase: SupabaseClient, column: "category_id" | "class_id", id: string) {
  const [transactions, mappings, budgetItems] = await Promise.all([
    countReferences(supabase, "transactions", column, id),
    countReferences(supabase, "mapped_descriptions", column, id),
    column === "category_id" ? countReferences(supabase, "budget_items", column, id) : 0,
  ]);
  const parts = [
    transactions > 0 && plural(transactions, "transaction", "transactions"),
    mappings > 0 && plural(mappings, "description rule", "description rules"),
    budgetItems > 0 && "the budget",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "other records";
}

/**
 * Deletes categories or classes one at a time, so a row the database refuses
 * to delete because it's still in use doesn't block the rest. Returned as a
 * value rather than thrown, since Next.js hides thrown server-action error
 * messages in production.
 */
export async function deleteIfUnused(
  supabase: SupabaseClient,
  table: "categories" | "classes",
  userId: string,
  ids: string[],
): Promise<DeleteResult> {
  const column = table === "categories" ? "category_id" : "class_id";
  const messages: string[] = [];
  const inUseIds: string[] = [];

  for (const id of ids) {
    const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", userId);

    if (!error) continue;

    if (error.code !== FOREIGN_KEY_VIOLATION) {
      messages.push(error.message);
      continue;
    }

    inUseIds.push(id);
    const { data: row } = await supabase.from(table).select("name").eq("id", id).single();
    const name = (row?.name as string | undefined) ?? "This item";
    messages.push(`"${name}" is in use (${await describeUsage(supabase, column, id)}) — deactivate it instead.`);
  }

  return { error: messages.length > 0 ? messages.join(" ") : null, inUseIds };
}
