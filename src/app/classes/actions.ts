"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { deleteIfUnused, type DeleteResult } from "@/lib/supabase/delete-if-unused";
import { isGordura } from "@/lib/classification";
import type { Gordura } from "@/lib/supabase/types";

// Errors are returned as values rather than thrown: Next.js hides thrown
// server-action messages in production.
export type ClassActionResult = { error: string | null };

function friendlyError(message: string, code?: string) {
  if (code === "23505") return "A class with this name already exists.";
  return message;
}

function revalidateClassPages() {
  revalidatePath("/classes");
  revalidatePath("/transactions");
  revalidatePath("/search");
  revalidatePath("/descriptions");
  revalidatePath("/");
}

function parseClassForm(formData: FormData) {
  const defaultGordura = formData.get("default_gordura");
  return {
    name: ((formData.get("name") as string) ?? "").trim(),
    categoryIds: [...new Set(formData.getAll("category_ids").map(String).filter(Boolean))],
    defaultGordura: isGordura(defaultGordura) ? defaultGordura : null,
  };
}

async function linkCategories(supabase: SupabaseClient, userId: string, classId: string, categoryIds: string[]) {
  if (categoryIds.length === 0) return null;
  const { error } = await supabase
    .from("category_classes")
    .insert(categoryIds.map((categoryId) => ({ user_id: userId, category_id: categoryId, class_id: classId })));
  return error?.message ?? null;
}

export async function addClass(formData: FormData): Promise<ClassActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { name, categoryIds, defaultGordura } = parseClassForm(formData);
  if (!name) return { error: "Name is required." };
  if (categoryIds.length === 0) return { error: "Pick at least one category." };

  const { data, error } = await supabase
    .from("classes")
    .insert({ user_id: user.id, name, default_gordura: defaultGordura })
    .select("id")
    .single();

  if (error) return { error: friendlyError(error.message, error.code) };

  const linkError = await linkCategories(supabase, user.id, data.id, categoryIds);

  revalidateClassPages();
  return { error: linkError };
}

export async function updateClass(formData: FormData): Promise<ClassActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;
  const { name, categoryIds, defaultGordura } = parseClassForm(formData);
  if (!name) return { error: "Name is required." };

  const { data: existing, error: existingError } = await supabase
    .from("classes")
    .select("default_gordura")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (existingError) return { error: existingError.message };
  const previousGordura = existing.default_gordura as Gordura | null;

  const { error } = await supabase
    .from("classes")
    .update({ name, default_gordura: defaultGordura })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: friendlyError(error.message, error.code) };

  // Changing a class's default gordura must not retroactively change what
  // an already-existing transaction shows (see effectiveGordura, which
  // falls back to this default only when the transaction has no gordura of
  // its own) — only a transaction assigned to this class from now on
  // should pick up the new default. Freeze every transaction currently
  // relying on the *old* default by writing it directly onto their own
  // `gordura` column before it stops being current. (If there was no old
  // default to freeze — `previousGordura` null — there's nothing to write:
  // a transaction with no gordura column value and no default to inherit
  // already reads as "Sem gordura" either way, so it isn't retroactively
  // changed to a real value here; it starts picking up the new default
  // like any other still-uncategorized-for-gordura transaction would.)
  if (previousGordura && previousGordura !== defaultGordura) {
    const { error: freezeError } = await supabase
      .from("transactions")
      .update({ gordura: previousGordura })
      .eq("class_id", id)
      .eq("user_id", user.id)
      .is("gordura", null);
    if (freezeError) return { error: freezeError.message };
  }

  const { data: links, error: linksError } = await supabase
    .from("category_classes")
    .select("category_id, categories(name)")
    .eq("class_id", id);

  if (linksError) return { error: linksError.message };

  const currentIds = new Set((links ?? []).map((link) => link.category_id as string));
  const wantedIds = new Set(categoryIds);
  const messages: string[] = [];

  const addError = await linkCategories(
    supabase,
    user.id,
    id,
    categoryIds.filter((categoryId) => !currentIds.has(categoryId)),
  );
  if (addError) messages.push(addError);

  // Unlink one at a time: the database refuses to remove a pair that
  // transactions or description rules still use, and that shouldn't block
  // the other removals.
  for (const link of links ?? []) {
    if (wantedIds.has(link.category_id)) continue;
    const { error: unlinkError } = await supabase
      .from("category_classes")
      .delete()
      .eq("class_id", id)
      .eq("category_id", link.category_id);
    if (!unlinkError) continue;
    const categoryName = (link.categories as unknown as { name: string } | null)?.name ?? "a category";
    messages.push(
      unlinkError.code === "23503"
        ? `Couldn't unlink "${categoryName}": transactions or description rules still use it with this class.`
        : unlinkError.message,
    );
  }

  revalidateClassPages();
  return { error: messages.length > 0 ? messages.join(" ") : null };
}

export async function deleteClasses(ids: string[]): Promise<DeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (ids.length === 0) return { error: null, inUseIds: [] };

  const result = await deleteIfUnused(supabase, "classes", user.id, ids);

  revalidateClassPages();
  return result;
}

// Inactive classes stay on existing transactions but are no longer offered in
// pickers (see pickableClasses).
export async function setClassesActive(ids: string[], isActive: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (ids.length === 0) return;

  const { error } = await supabase
    .from("classes")
    .update({ is_active: isActive })
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidateClassPages();
}
