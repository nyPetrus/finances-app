"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const label = (formData.get("label") as string)?.trim() || null;
  const name = (formData.get("name") as string).trim();
  const type = formData.get("type") as string;
  const current_balance = Number(formData.get("current_balance"));

  if (!name) return;

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    label,
    name,
    source: "Manual",
    type,
    current_balance: Number.isFinite(current_balance) ? current_balance : 0,
    is_automatic: false,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/accounts");
}

export async function updateAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;
  const label = (formData.get("label") as string)?.trim() || null;
  const name = (formData.get("name") as string).trim();
  const type = formData.get("type") as string;

  if (!name) return;

  // Deliberately doesn't touch updated_at: for automatic accounts that
  // timestamp is read as "last synced" (see pluggy-actions.ts), and
  // editing these fields here isn't a sync.
  const { error } = await supabase
    .from("accounts")
    .update({ label, name, type })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/accounts");
}

export async function deleteAccounts(ids: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (ids.length === 0) return;

  const { error } = await supabase
    .from("accounts")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/");
}
