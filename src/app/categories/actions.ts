"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteIfUnused, type DeleteResult } from "@/lib/supabase/delete-if-unused";

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
  const icon = formData.get("icon") as string;

  if (!name) return;

  const { error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name, kind, icon });

  if (error) throwFriendlyError(error.message, error.code);

  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/search");
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
  const icon = formData.get("icon") as string;

  if (!name) return;

  const { error } = await supabase
    .from("categories")
    .update({ name, kind, icon })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throwFriendlyError(error.message, error.code);

  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/search");
}

export async function deleteCategories(ids: string[]): Promise<DeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (ids.length === 0) return { error: null, inUseIds: [] };

  const result = await deleteIfUnused(supabase, "categories", user.id, ids);

  revalidatePath("/categories");
  revalidatePath("/classes");
  revalidatePath("/transactions");
  revalidatePath("/search");

  return result;
}

// Inactive categories stay on existing transactions but are no longer offered
// in pickers (see pickableCategories).
export async function setCategoriesActive(ids: string[], isActive: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (ids.length === 0) return;

  const { error } = await supabase
    .from("categories")
    .update({ is_active: isActive })
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/categories");
  revalidatePath("/classes");
  revalidatePath("/transactions");
  revalidatePath("/search");
  revalidatePath("/descriptions");
}
