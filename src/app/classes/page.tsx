import { createClient } from "@/lib/supabase/server";
import { fetchClasses } from "@/lib/supabase/fetch-classes";
import type { Category, Class } from "@/lib/supabase/types";
import { ClassesTable } from "./classes-table";
import { isSortKey, type SortKey } from "./sort";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { sort: sortParam, dir: dirParam } = await searchParams;
  const sortKey: SortKey = isSortKey(sortParam) ? sortParam : "name";
  const sortDir: "asc" | "desc" = dirParam === "desc" ? "desc" : "asc";

  const supabase = await createClient();
  const [{ data: categories, error: catError }, allClasses] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    fetchClasses(supabase),
  ]);

  if (catError) throw new Error(catError.message);

  const allCategories = (categories ?? []) as Category[];

  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));
  const categoryNames = (classItem: Class) =>
    classItem.category_ids
      .map((id) => categoriesById.get(id)?.name ?? "")
      .sort((a, b) => a.localeCompare(b))
      .join(", ");

  const sortedClasses = [...allClasses].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "category":
        cmp = categoryNames(a).localeCompare(categoryNames(b)) || a.name.localeCompare(b.name);
        break;
      case "gordura":
        cmp = (a.default_gordura ?? "").localeCompare(b.default_gordura ?? "") || a.name.localeCompare(b.name);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Classes</h1>

      {allCategories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories yet. Create one on the Categories page first.
        </p>
      ) : (
        <ClassesTable classes={sortedClasses} categories={allCategories} sortKey={sortKey} sortDir={sortDir} />
      )}
    </div>
  );
}
