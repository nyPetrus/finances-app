"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const account_id = formData.get("account_id") as string;
  const category_id = (formData.get("category_id") as string) || null;
  const date = formData.get("date") as string;
  const description = (formData.get("description") as string).trim();
  const amount = Number(formData.get("amount"));

  if (!account_id || !date || !description || !Number.isFinite(amount)) return;

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id,
    category_id,
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
  const date = formData.get("date") as string;
  const description = (formData.get("description") as string).trim();
  const amount = Number(formData.get("amount"));

  if (!description || !Number.isFinite(amount)) return;

  const { error } = await supabase
    .from("transactions")
    .update({ account_id, category_id, date, description, amount })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
}

export async function deleteTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
}
