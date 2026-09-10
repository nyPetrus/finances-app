import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/supabase/types";
import { CategoriesTable } from "./categories-table";
import { AddCategoryDialog } from "./add-category-dialog";
import { isSortKey, type SortKey } from "./sort";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { sort: sortParam, dir: dirParam } = await searchParams;
  const sortKey: SortKey = isSortKey(sortParam) ? sortParam : "name";
  const sortDir: "asc" | "desc" = dirParam === "desc" ? "desc" : "asc";

  const supabase = await createClient();
  const { data: categories, error } = await supabase.from("categories").select("*");

  if (error) throw new Error(error.message);

  const allCategories = (categories ?? []) as Category[];

  const sortedCategories = [...allCategories].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "type":
        cmp = a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <AddCategoryDialog />
      </div>

      <CategoriesTable categories={sortedCategories} sortKey={sortKey} sortDir={sortDir} />
    </div>
  );
}
