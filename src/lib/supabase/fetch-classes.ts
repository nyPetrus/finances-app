import type { SupabaseClient } from "@supabase/supabase-js";
import type { Class } from "./types";

/**
 * Classes with the categories each one is linked to (category_classes) folded
 * into `category_ids`, so pickers can list only the classes valid for a
 * chosen category.
 */
export async function fetchClasses(supabase: SupabaseClient): Promise<Class[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("*, category_classes(category_id)")
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map(({ category_classes, ...classItem }) => ({
    ...classItem,
    category_ids: (category_classes as { category_id: string }[]).map((link) => link.category_id),
  })) as Class[];
}
