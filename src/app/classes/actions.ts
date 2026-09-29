"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { deleteIfUnused, type DeleteResult } from "@/lib/supabase/delete-if-unused";
import { DEFAULT_AUTONOMY, isAutonomy } from "@/lib/classification";
import { CATEGORY_ICONS, DEFAULT_CLASS_ICON } from "@/lib/category-icons";
import type { Autonomy } from "@/lib/supabase/types";

// Errors are returned as values rather than thrown: Next.js hides thrown
// server-action messages in production.
export type ClassActionResult = { error: string | null };

function friendlyError(message: string, code?: string) {
  if (code === "23505") return "A class with this name already exists.";
  return message;
}

function revalidateClassPages() {
  revalidatePath("/categories");
  revalidatePath("/search");
  revalidatePath("/descriptions");
  revalidatePath("/");
}

function parseClassForm(formData: FormData) {
  const defaultAutonomy = formData.get("autonomy");
  const icon = formData.get("icon");
  return {
    name: ((formData.get("name") as string) ?? "").trim(),
    categoryIds: [...new Set(formData.getAll("category_ids").map(String).filter(Boolean))],
    defaultAutonomy: isAutonomy(defaultAutonomy) ? defaultAutonomy : null,
    icon: typeof icon === "string" && CATEGORY_ICONS.includes(icon) ? icon : DEFAULT_CLASS_ICON,
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

  const { name, categoryIds, defaultAutonomy, icon } = parseClassForm(formData);
  if (!name) return { error: "Name is required." };
  if (categoryIds.length === 0) return { error: "Pick at least one category." };

  const { data, error } = await supabase
    .from("classes")
    .insert({ user_id: user.id, name, autonomy: defaultAutonomy, icon })
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
  const { name, categoryIds, defaultAutonomy, icon } = parseClassForm(formData);
  if (!name) return { error: "Name is required." };

  const { data: existing, error: existingError } = await supabase
    .from("classes")
    .select("autonomy")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (existingError) return { error: existingError.message };
  const previousAutonomy = existing.autonomy as Autonomy | null;

  const { error } = await supabase
    .from("classes")
    .update({ name, autonomy: defaultAutonomy, icon })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: friendlyError(error.message, error.code) };

  // Changing a class's default autonomy must not retroactively change what
  // an already-existing transaction shows (see effectiveAutonomy, which
  // falls back to this default — or DEFAULT_AUTONOMY when the class has no
  // default of its own — only when the transaction has no autonomy of its
  // own) — only a transaction assigned to this class from now on should
  // pick up the new default. Freeze every transaction currently relying on
  // the *old* effective default by writing it directly onto their own
  // `autonomy` column before it stops being current. Both sides fall back to
  // DEFAULT_AUTONOMY (never null), so a class going from "no default" to an
  // explicit one freezes correctly too — there's no longer an unrepresentable
  // "unset" state to worry about.
  const previousEffective = previousAutonomy ?? DEFAULT_AUTONOMY;
  const newEffective = defaultAutonomy ?? DEFAULT_AUTONOMY;
  if (previousEffective !== newEffective) {
    const { error: freezeError } = await supabase
      .from("transactions")
      .update({ autonomy: previousEffective })
      .eq("class_id", id)
      .eq("user_id", user.id)
      .is("autonomy", null);
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

// Links an existing class to one more category (the Categories & Classes
// tree's "Link existing class" item).
export async function linkClassToCategory(classId: string, categoryId: string): Promise<ClassActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("category_classes")
    .insert({ user_id: user.id, category_id: categoryId, class_id: classId });

  revalidateClassPages();
  if (error?.code === "23505") return { error: "This class is already in that category." };
  return { error: error?.message ?? null };
}

// Removes (category, class) links without touching the classes themselves.
// One at a time, like updateClass: the database refuses to remove a pair that
// transactions or description rules still use, and that shouldn't block the
// other removals.
export async function unlinkClassesFromCategories(
  links: { categoryId: string; classId: string }[],
): Promise<ClassActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  let blocked = 0;
  const messages: string[] = [];
  for (const { categoryId, classId } of links) {
    const { error } = await supabase
      .from("category_classes")
      .delete()
      .eq("user_id", user.id)
      .eq("category_id", categoryId)
      .eq("class_id", classId);
    if (!error) continue;
    if (error.code === "23503") blocked++;
    else messages.push(error.message);
  }
  if (blocked > 0) {
    messages.unshift(
      blocked === 1
        ? "Couldn't remove 1 class from its category: transactions or description rules still use that pair."
        : `Couldn't remove ${blocked} classes from their categories: transactions or description rules still use those pairs.`,
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
