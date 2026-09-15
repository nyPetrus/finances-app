import { createClient } from "@/lib/supabase/server";
import type { Category, Class } from "@/lib/supabase/types";
import { CombinationsTable } from "./combinations-table";
import { isSortKey, type SortKey } from "./sort";

const KIND_ORDER: Category["kind"][] = ["income", "expense", "transfer"];

export default async function CombinationsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { sort: sortParam, dir: dirParam } = await searchParams;
  const sortKey: SortKey = isSortKey(sortParam) ? sortParam : "type";
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
    const categoryA = categoriesById.get(a.category_id);
    const categoryB = categoriesById.get(b.category_id);
    let cmp = 0;
    switch (sortKey) {
      case "type":
        cmp =
          KIND_ORDER.indexOf(categoryA?.kind ?? "expense") -
            KIND_ORDER.indexOf(categoryB?.kind ?? "expense") ||
          (categoryA?.name ?? "").localeCompare(categoryB?.name ?? "") ||
          a.name.localeCompare(b.name);
        break;
      case "category":
        cmp = (categoryA?.name ?? "").localeCompare(categoryB?.name ?? "") || a.name.localeCompare(b.name);
        break;
      case "class":
        cmp = a.name.localeCompare(b.name);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Combinations</h1>

      {allCategories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories yet. Create one on the Categories page first.
        </p>
      ) : (
        <CombinationsTable classes={sortedClasses} categories={allCategories} sortKey={sortKey} sortDir={sortDir} />
      )}
    </div>
  );
}
