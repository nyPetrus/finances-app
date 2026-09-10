import { createClient } from "@/lib/supabase/server";
import type { Category, Class } from "@/lib/supabase/types";
import { ClassesTable } from "./classes-table";
import { AddClassDialog } from "./add-class-dialog";
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
  const [{ data: categories, error: catError }, { data: classes, error: classError }] =
    await Promise.all([
      supabase.from("categories").select("*"),
      supabase.from("classes").select("*"),
    ]);

  if (catError) throw new Error(catError.message);
  if (classError) throw new Error(classError.message);

  const allCategories = (categories ?? []) as Category[];
  const allClasses = (classes ?? []) as Class[];

  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));

  const sortedClasses = [...allClasses].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "category": {
        const aName = categoriesById.get(a.category_id)?.name ?? "";
        const bName = categoriesById.get(b.category_id)?.name ?? "";
        cmp = aName.localeCompare(bName) || a.name.localeCompare(b.name);
        break;
      }
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Classes</h1>
        {allCategories.length > 0 && <AddClassDialog categories={allCategories} />}
      </div>

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
