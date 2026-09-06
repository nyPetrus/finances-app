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

function normalizeDescription(value: string) {
  return value.trim().toLowerCase();
}

export async function syncMappedDescriptions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const [{ data: mappings, error: mapError }, { data: candidates, error: txError }] = await Promise.all([
    supabase.from("mapped_descriptions").select("*").eq("user_id", user.id),
    supabase
      .from("transactions")
      .select("id, description")
      .eq("user_id", user.id)
      .is("category_id", null),
  ]);

  if (mapError) throw new Error(mapError.message);
  if (txError) throw new Error(txError.message);

  const mappingByNormalizedDescription = new Map(
    (mappings ?? []).map((mapping) => [normalizeDescription(mapping.description), mapping]),
  );

  const idsByNormalizedDescription = new Map<string, string[]>();
  for (const candidate of candidates ?? []) {
    const key = normalizeDescription(candidate.description);
    if (!mappingByNormalizedDescription.has(key)) continue;
    const ids = idsByNormalizedDescription.get(key) ?? [];
    ids.push(candidate.id);
    idsByNormalizedDescription.set(key, ids);
  }

  let updatedCount = 0;
  for (const [key, ids] of idsByNormalizedDescription) {
    const mapping = mappingByNormalizedDescription.get(key)!;
    const { error } = await supabase
      .from("transactions")
      .update({ category_id: mapping.category_id, class_id: mapping.class_id })
      .in("id", ids);

    if (error) throw new Error(error.message);
    updatedCount += ids.length;
  }

  revalidatePath("/transactions");
  revalidatePath("/descriptions");
  revalidatePath("/budget");
  revalidatePath("/");

  return updatedCount;
}
