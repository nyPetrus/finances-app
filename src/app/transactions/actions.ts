"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncMappedDescriptions } from "@/app/descriptions/actions";

function combineDateAndTime(dateInput: string, timeInput: string) {
  return `${dateInput}T${timeInput || "00:00"}:00`;
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
    date,
    description,
    amount,
    source: "manual",
  });

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
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
    .update({ account_id, category_id, class_id, date, description, amount })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
}

export async function setTransactionsHidden(ids: string[], hidden: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (ids.length === 0) return;

  const { error } = await supabase
    .from("transactions")
    .update({ is_hidden: hidden })
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/");
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

export async function deleteTransactions(ids: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (ids.length === 0) return;

  const { error } = await supabase
    .from("transactions")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/");
}
