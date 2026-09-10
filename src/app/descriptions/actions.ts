"use server";

import { revalidatePath } from "next/cache";
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

  const allMappings = (mappings ?? []) as MappedDescription[];
  const allCandidates = (candidates ?? []) as { id: string; description: string }[];

  const equalMappings = allMappings.filter((m) => m.check_type === "equal_to");
  const startsWithMappings = allMappings.filter((m) => m.check_type === "starts_with");
  const containsMappings = allMappings.filter((m) => m.check_type === "contains");

  // Each transaction is claimed by at most one mapping, in priority order
  // (equal_to, then starts_with, then contains) — once matched it's
  // skipped by the later, lower-priority passes.
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

  revalidatePath("/transactions");
  revalidatePath("/descriptions");
  revalidatePath("/budget");
  revalidatePath("/");

  return updatedCount;
}

// Infers a mapping for every description that appears on at least one
// already-categorized transaction but has no explicit mapped_descriptions
// rule yet, then applies the full mapping set (existing rules + the newly
// inferred ones) to every uncategorized transaction via syncMappedDescriptions.
export async function autoCategorizeFromHistory() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const [{ data: mappings, error: mapError }, { data: categorized, error: txError }] = await Promise.all([
    supabase.from("mapped_descriptions").select("description").eq("user_id", user.id),
    supabase
      .from("transactions")
      .select("description, category_id, class_id")
      .eq("user_id", user.id)
      .not("category_id", "is", null),
  ]);

  if (mapError) throw new Error(mapError.message);
  if (txError) throw new Error(txError.message);

  const mappedDescriptions = new Set(
    (mappings ?? []).map((m) => normalizeDescription(m.description)),
  );

  // For each description not already covered by an explicit rule, tally
  // the category/class combo used on its categorized transactions and keep
  // the most common one — a description categorized inconsistently in the
  // past shouldn't silently flip-flop, so ties just keep whichever combo
  // was tallied first.
  const combosByDescription = new Map<
    string,
    Map<string, { category_id: string; class_id: string | null; count: number }>
  >();

  for (const transaction of (categorized ?? []) as {
    description: string;
    category_id: string | null;
    class_id: string | null;
  }[]) {
    if (!transaction.category_id) continue;
    const normalized = normalizeDescription(transaction.description);
    if (mappedDescriptions.has(normalized)) continue;

    const key = `${transaction.category_id}|${transaction.class_id ?? ""}`;
    const combos = combosByDescription.get(normalized) ?? new Map();
    const entry = combos.get(key) ?? {
      category_id: transaction.category_id,
      class_id: transaction.class_id,
      count: 0,
    };
    entry.count += 1;
    combos.set(key, entry);
    combosByDescription.set(normalized, combos);
  }

  const inferredMappings = Array.from(combosByDescription.entries()).map(([description, combos]) => {
    let best = { category_id: "", class_id: null as string | null, count: 0 };
    for (const combo of combos.values()) {
      if (combo.count > best.count) best = combo;
    }
    return {
      user_id: user.id,
      description,
      category_id: best.category_id,
      class_id: best.class_id,
      check_type: "equal_to" as const,
    };
  });

  if (inferredMappings.length > 0) {
    const { error: upsertError } = await supabase
      .from("mapped_descriptions")
      .upsert(inferredMappings, { onConflict: "user_id,description" });

    if (upsertError) throw new Error(upsertError.message);
  }

  const categorizedCount = await syncMappedDescriptions();

  return { newMappings: inferredMappings.length, categorizedCount };
}
