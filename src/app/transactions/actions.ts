"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncMappedDescriptions } from "@/app/descriptions/actions";
import { isAutonomy } from "@/lib/classification";
import type { Autonomy } from "@/lib/supabase/types";

function combineDateAndTime(dateInput: string, timeInput: string) {
  return `${dateInput}T${timeInput || "00:00"}:00`;
}

// "default" (or anything else) clears the override so the class default applies.
function parseAutonomy(formData: FormData) {
  const value = formData.get("autonomy");
  return isAutonomy(value) ? value : null;
}

export async function addTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const account_id = formData.get("account_id") as string;
  const category_id = (formData.get("category_id") as string) || null;
  const class_id = (formData.get("class_id") as string) || null;
  const dateInput = formData.get("date") as string;
  const timeInput = formData.get("time") as string;
  const description = (formData.get("description") as string).trim().toLowerCase();
  const amount = Number(formData.get("amount"));

  if (!account_id || !dateInput || !description || !Number.isFinite(amount)) return;

  const date = combineDateAndTime(dateInput, timeInput);

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id,
    category_id,
    class_id,
    autonomy: parseAutonomy(formData),
    date,
    description,
    amount,
    source: "manual",
  });

  if (error) throw new Error(error.message);

  revalidatePath("/search");
}

export async function updateTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;
  const account_id = formData.get("account_id") as string;
  const category_id = (formData.get("category_id") as string) || null;
  const class_id = (formData.get("class_id") as string) || null;
  const dateInput = formData.get("date") as string;
  const timeInput = formData.get("time") as string;
  const description = (formData.get("description") as string).trim().toLowerCase();
  const amount = Number(formData.get("amount"));

  if (!dateInput || !description || !Number.isFinite(amount)) return;

  const date = combineDateAndTime(dateInput, timeInput);

  const { error } = await supabase
    .from("transactions")
    .update({
      account_id,
      category_id,
      class_id,
      date,
      description,
      amount,
      ...(formData.has("autonomy") && { autonomy: parseAutonomy(formData) }),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/search");
}

export async function syncDescriptionsFromTransactions(transactionIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (transactionIds.length === 0) return 0;

  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("description, category_id, class_id")
    .in("id", transactionIds)
    .eq("user_id", user.id);

  if (txError) throw new Error(txError.message);

  const eligible = (transactions ?? []).filter(
    (transaction): transaction is typeof transaction & { category_id: string } => !!transaction.category_id,
  );
  if (eligible.length === 0) {
    throw new Error("Assign a category to at least one selected transaction before syncing.");
  }

  const { error: upsertError } = await supabase.from("mapped_descriptions").upsert(
    eligible.map((transaction) => ({
      user_id: user.id,
      description: transaction.description,
      category_id: transaction.category_id,
      class_id: transaction.class_id,
      check_type: "equal_to" as const,
    })),
    { onConflict: "user_id,description" },
  );

  if (upsertError) throw new Error(upsertError.message);

  return syncMappedDescriptions();
}

// Batch-edits category/class/autonomy across many transactions at once — the
// Search page's selection toolbar ("Edit" button). Each field is applied
// only when the caller includes its key at all: an omitted key leaves every
// selected transaction's existing value alone, while an included key
// (even `null`, for "clear category"/"clear class"/"clear autonomy
// override") overwrites it on every one of them. This mirrors
// updateTransaction's own `formData.has("autonomy")` presence check for the
// same "did the user actually touch this field" distinction, just across
// three fields and many rows instead of one.
export type BulkClassificationUpdate = {
  category_id?: string | null;
  class_id?: string | null;
  autonomy?: Autonomy | null;
};

export async function bulkUpdateClassification(ids: string[], updates: BulkClassificationUpdate) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (ids.length === 0) return;

  const patch: Partial<Record<"category_id" | "class_id" | "autonomy", string | null>> = {};
  if ("category_id" in updates) patch.category_id = updates.category_id ?? null;
  if ("class_id" in updates) patch.class_id = updates.class_id ?? null;
  if ("autonomy" in updates) patch.autonomy = updates.autonomy ?? null;

  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("transactions").update(patch).in("id", ids).eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/search");
  revalidatePath("/budget");
  revalidatePath("/");
}

// Transactions have no delete path at all any more, for safety — only
// deactivate/reactivate via the existing is_hidden column. Presented in the
// UI as "Deactivate"/"Activate", same vocabulary as categories/classes/
// accounts, even though the underlying column is named is_hidden rather
// than is_active.
export async function setTransactionsActive(ids: string[], isActive: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (ids.length === 0) return;

  const { error } = await supabase
    .from("transactions")
    .update({ is_hidden: !isActive })
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/search");
  revalidatePath("/budget");
  revalidatePath("/");
}
