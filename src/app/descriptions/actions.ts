"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addMappedDescription(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const description = (formData.get("description") as string).trim();
  const categoryId = formData.get("category_id") as string;
  const classId = (formData.get("class_id") as string) || null;

  if (!description || !categoryId) return;

  const { error } = await supabase
    .from("mapped_descriptions")
    .insert({ user_id: user.id, description, category_id: categoryId, class_id: classId });

  if (error) throw new Error(error.message);

  revalidatePath("/descriptions");
}

export async function updateMappedDescription(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const originalDescription = formData.get("original_description") as string;
  const description = (formData.get("description") as string).trim();
  const categoryId = formData.get("category_id") as string;
  const classId = (formData.get("class_id") as string) || null;

  if (!description || !categoryId) return;

  const { error } = await supabase
    .from("mapped_descriptions")
    .update({ description, category_id: categoryId, class_id: classId })
    .eq("user_id", user.id)
    .eq("description", originalDescription);

  if (error) throw new Error(error.message);

  revalidatePath("/descriptions");
}

export async function deleteMappedDescription(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const description = formData.get("description") as string;

  const { error } = await supabase
    .from("mapped_descriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("description", description);

  if (error) throw new Error(error.message);

  revalidatePath("/descriptions");
}

export async function syncMappedDescriptions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: mappings, error: mapError } = await supabase
    .from("mapped_descriptions")
    .select("*")
    .eq("user_id", user.id);

  if (mapError) throw new Error(mapError.message);

  let updatedCount = 0;
  for (const mapping of mappings ?? []) {
    const { data, error } = await supabase
      .from("transactions")
      .update({ category_id: mapping.category_id, class_id: mapping.class_id })
      .eq("user_id", user.id)
      .eq("description", mapping.description)
      .is("category_id", null)
      .select("id");

    if (error) throw new Error(error.message);
    updatedCount += data?.length ?? 0;
  }

  revalidatePath("/transactions");
  revalidatePath("/descriptions");
  revalidatePath("/budget");
  revalidatePath("/");

  return updatedCount;
}
