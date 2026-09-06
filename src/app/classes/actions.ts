"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function throwFriendlyError(message: string, code?: string): never {
  if (code === "23505") throw new Error("A class with this name already exists.");
  throw new Error(message);
}

export async function addClass(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = (formData.get("name") as string).trim();
  const categoryId = formData.get("category_id") as string;

  if (!name || !categoryId) return;

  const { error } = await supabase
    .from("classes")
    .insert({ user_id: user.id, category_id: categoryId, name });

  if (error) throwFriendlyError(error.message, error.code);

  revalidatePath("/classes");
}

export async function updateClass(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;
  const name = (formData.get("name") as string).trim();
  const categoryId = formData.get("category_id") as string;

  if (!name || !categoryId) return;

  const { error } = await supabase
    .from("classes")
    .update({ name, category_id: categoryId })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throwFriendlyError(error.message, error.code);

  revalidatePath("/classes");
}

export async function deleteClass(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/classes");
}
