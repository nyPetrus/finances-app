"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function throwFriendlyError(message: string, code?: string): never {
  if (code === "23505") throw new Error("A category with this name already exists.");
  throw new Error(message);
}

export async function addCategory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = (formData.get("name") as string).trim();
  const kind = formData.get("kind") as string;
  const color = formData.get("color") as string;

  if (!name) return;

  const { error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name, kind, color });

  if (error) throwFriendlyError(error.message, error.code);

  revalidatePath("/categories");
  revalidatePath("/transactions");
}

export async function updateCategory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;
  const name = (formData.get("name") as string).trim();
  const kind = formData.get("kind") as string;
  const color = formData.get("color") as string;

  if (!name) return;

  const { error } = await supabase
    .from("categories")
    .update({ name, kind, color })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throwFriendlyError(error.message, error.code);

  revalidatePath("/categories");
  revalidatePath("/transactions");
}

export async function deleteCategory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/categories");
  revalidatePath("/transactions");
}
