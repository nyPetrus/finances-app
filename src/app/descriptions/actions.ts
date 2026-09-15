"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { MappedDescription } from "@/lib/supabase/types";

const CHECK_TYPES = ["equal_to", "starts_with", "contains"] as const;

function isCheckType(value: string | null): value is MappedDescription["check_type"] {
  return !!value && (CHECK_TYPES as readonly string[]).includes(value);
}

export async function addMappedDescription(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const description = (formData.get("description") as string).trim();
  const categoryId = formData.get("category_id") as string;
  const classId = (formData.get("class_id") as string) || null;
  const checkTypeInput = formData.get("check_type") as string | null;
  const checkType = isCheckType(checkTypeInput) ? checkTypeInput : "equal_to";

  if (!description || !categoryId) return;

  const { error } = await supabase.from("mapped_descriptions").insert({
    user_id: user.id,
    description,
    category_id: categoryId,
    class_id: classId,
    check_type: checkType,
  });

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
  const checkTypeInput = formData.get("check_type") as string | null;
  const checkType = isCheckType(checkTypeInput) ? checkTypeInput : "equal_to";

  if (!description || !categoryId) return;

  const { error } = await supabase
    .from("mapped_descriptions")
    .update({ description, category_id: categoryId, class_id: classId, check_type: checkType })
    .eq("user_id", user.id)
    .eq("description", originalDescription);

  if (error) throw new Error(error.message);

  revalidatePath("/descriptions");
}

export async function deleteMappedDescriptions(descriptions: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (descriptions.length === 0) return;

  const { error } = await supabase
    .from("mapped_descriptions")
    .delete()
    .eq("user_id", user.id)
    .in("description", descriptions);

  if (error) throw new Error(error.message);

  revalidatePath("/descriptions");
}

function normalizeDescription(value: string) {
  return value.trim().toLowerCase();
}

// Matches each candidate transaction against the mapping set — equal_to
// beats starts_with beats contains, longest pattern wins within a tier, and
// each transaction is claimed by at most one mapping — then writes the
// resulting category_id/class_id, grouped into one update per distinct
// combo. Shared by syncMappedDescriptions (uncategorized transactions only)
// and syncAllMappedDescriptions (every transaction, so a mapping can also
// override a transaction's existing category/class).
async function applyMappingSet(
  supabase: SupabaseClient,
  allMappings: MappedDescription[],
  allCandidates: { id: string; description: string }[],
) {
  const equalMappings = allMappings.filter((m) => m.check_type === "equal_to");
  const startsWithMappings = allMappings.filter((m) => m.check_type === "starts_with");
  const containsMappings = allMappings.filter((m) => m.check_type === "contains");

  const matchedIds = new Set<string>();
  const updatesByKey = new Map<string, { category_id: string; class_id: string | null; ids: string[] }>();

  function assign(id: string, mapping: MappedDescription) {
    matchedIds.add(id);
    const key = `${mapping.category_id}|${mapping.class_id ?? ""}`;
    const entry = updatesByKey.get(key) ?? {
      category_id: mapping.category_id,
      class_id: mapping.class_id,
      ids: [] as string[],
    };
    entry.ids.push(id);
    updatesByKey.set(key, entry);
  }

  // Pass 1: exact match.
  const equalByNormalizedDescription = new Map(
    equalMappings.map((mapping) => [normalizeDescription(mapping.description), mapping]),
  );
  for (const candidate of allCandidates) {
    const mapping = equalByNormalizedDescription.get(normalizeDescription(candidate.description));
    if (mapping) assign(candidate.id, mapping);
  }

  // Pass 2: prefix match — if more than one pattern matches, the longest
  // (most specific) one wins.
  for (const candidate of allCandidates) {
    if (matchedIds.has(candidate.id)) continue;
    const normalizedDescription = normalizeDescription(candidate.description);
    let best: MappedDescription | null = null;
    let bestLength = 0;
    for (const mapping of startsWithMappings) {
      const pattern = normalizeDescription(mapping.description);
      if (pattern && normalizedDescription.startsWith(pattern) && pattern.length > bestLength) {
        best = mapping;
        bestLength = pattern.length;
      }
    }
    if (best) assign(candidate.id, best);
  }

  // Pass 3: substring match — same longest-wins tiebreak.
  for (const candidate of allCandidates) {
    if (matchedIds.has(candidate.id)) continue;
    const normalizedDescription = normalizeDescription(candidate.description);
    let best: MappedDescription | null = null;
    let bestLength = 0;
    for (const mapping of containsMappings) {
      const pattern = normalizeDescription(mapping.description);
      if (pattern && normalizedDescription.includes(pattern) && pattern.length > bestLength) {
        best = mapping;
        bestLength = pattern.length;
      }
    }
    if (best) assign(candidate.id, best);
  }

  let updatedCount = 0;
  for (const { category_id, class_id, ids } of updatesByKey.values()) {
    const { error } = await supabase
      .from("transactions")
      .update({ category_id, class_id })
      .in("id", ids);

    if (error) throw new Error(error.message);
    updatedCount += ids.length;
  }

  return updatedCount;
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

  const updatedCount = await applyMappingSet(
    supabase,
    (mappings ?? []) as MappedDescription[],
    (candidates ?? []) as { id: string; description: string }[],
  );

  revalidatePath("/transactions");
  revalidatePath("/descriptions");
  revalidatePath("/budget");
  revalidatePath("/");

  return updatedCount;
}

// Like syncMappedDescriptions, but matches against every transaction rather
// than only uncategorized ones — so a mapping can also correct transactions
// that already carry a (different) category/class. Unlike the uncategorized
// query above, this isn't narrowed by a filter that keeps it well under
// Supabase/PostgREST's 1000-row cap, so it has to page through with
// .range() instead of a single .select() — see PITFALLS.md.
export async function syncAllMappedDescriptions() {
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

  const pageSize = 1000;
  const allCandidates: { id: string; description: string }[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, description")
      .eq("user_id", user.id)
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    allCandidates.push(...data);

    if (data.length < pageSize) break;
  }

  const updatedCount = await applyMappingSet(supabase, (mappings ?? []) as MappedDescription[], allCandidates);

  revalidatePath("/transactions");
  revalidatePath("/descriptions");
  revalidatePath("/budget");
  revalidatePath("/");

  return updatedCount;
}
