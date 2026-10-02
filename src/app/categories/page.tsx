import { createClient } from "@/lib/supabase/server";
import { fetchClasses } from "@/lib/supabase/fetch-classes";
import type { Category, Class } from "@/lib/supabase/types";
import { CategoriesTable, type CategoryGroup } from "./categories-table";
import { isSortKey, type SortKey } from "./sort";

// Categories and classes on one tree table: each category row expands into
// the classes linked to it (category_classes), so a class shared by several
// categories appears under each one. Classes linked to no category are
// collected under a trailing "(No category)" group.
export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { sort: sortParam, dir: dirParam } = await searchParams;
  const sortKey: SortKey = isSortKey(sortParam) ? sortParam : "name";
  const sortDir: "asc" | "desc" = dirParam === "desc" ? "desc" : "asc";
  const sign = sortDir === "asc" ? 1 : -1;

  const supabase = await createClient();
  const [{ data: categories, error }, allClasses] = await Promise.all([
    supabase.from("categories").select("*"),
    fetchClasses(supabase),
  ]);

  if (error) throw new Error(error.message);

  const allCategories = (categories ?? []) as Category[];
  const categoryIds = new Set(allCategories.map((category) => category.id));

  const classesByCategory = new Map<string, Class[]>();
  const unlinked: Class[] = [];
  for (const classItem of allClasses) {
    const linkedIds = classItem.category_ids.filter((id) => categoryIds.has(id));
    if (linkedIds.length === 0) unlinked.push(classItem);
    for (const id of linkedIds) {
      const list = classesByCategory.get(id) ?? [];
      list.push(classItem);
      classesByCategory.set(id, list);
    }
  }

  // Each sort key applies to the level it belongs to; the other level stays
  // by name, ascending.
  function compareClasses(a: Class, b: Class) {
    if (sortKey === "autonomy") {
      return sign * ((a.autonomy ?? "").localeCompare(b.autonomy ?? "") || a.name.localeCompare(b.name));
    }
    if (sortKey === "name") return sign * a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  }

  function compareCategories(a: Category, b: Category) {
    switch (sortKey) {
      case "name":
        return sign * a.name.localeCompare(b.name);
      case "type":
        return sign * (a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
      case "classes":
        return (
          sign *
            ((classesByCategory.get(a.id)?.length ?? 0) - (classesByCategory.get(b.id)?.length ?? 0)) ||
          a.name.localeCompare(b.name)
        );
      case "autonomy":
        return a.name.localeCompare(b.name);
    }
  }

  const groups: CategoryGroup[] = [...allCategories].sort(compareCategories).map((category) => ({
    category,
    classes: [...(classesByCategory.get(category.id) ?? [])].sort(compareClasses),
  }));
  if (unlinked.length > 0) groups.push({ category: null, classes: unlinked.sort(compareClasses) });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold max-md:sr-only">Categories &amp; Classes</h1>

      <CategoriesTable
        groups={groups}
        categories={[...allCategories].sort((a, b) => a.name.localeCompare(b.name))}
        classes={allClasses}
        sortKey={sortKey}
        sortDir={sortDir}
      />
    </div>
  );
}
