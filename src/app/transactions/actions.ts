"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  const description = (formData.get("description") as string).trim();
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
  const description = (formData.get("description") as string).trim();
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

export async function setTransactionHidden(id: string, hidden: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("transactions")
    .update({ is_hidden: hidden })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/");
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
