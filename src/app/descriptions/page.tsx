import { createClient } from "@/lib/supabase/server";
import type { Category, Class, MappedDescription } from "@/lib/supabase/types";
import { DescriptionsTable } from "./descriptions-table";
import { SyncButton } from "./sync-button";
import { isSortKey, type SortKey } from "./sort";

const checkTypeLabels: Record<MappedDescription["check_type"], string> = {
  equal_to: "Equal to",
  starts_with: "Starts with",
  contains: "Contains",
};

export default async function DescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { sort: sortParam, dir: dirParam } = await searchParams;
  const sortKey: SortKey = isSortKey(sortParam) ? sortParam : "description";
  const sortDir: "asc" | "desc" = dirParam === "desc" ? "desc" : "asc";

  const supabase = await createClient();

  const [
    { data: categories, error: catError },
    { data: classes, error: classError },
    { data: mappings, error: mapError },
  ] = await Promise.all([
    supabase.from("categories").select("*"),
    supabase.from("classes").select("*"),
    supabase.from("mapped_descriptions").select("*"),
  ]);

  if (catError) throw new Error(catError.message);
  if (classError) throw new Error(classError.message);
  if (mapError) throw new Error(mapError.message);

  const allCategories = (categories ?? []) as Category[];
  const allClasses = (classes ?? []) as Class[];
  const allMappings = (mappings ?? []) as MappedDescription[];

  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));
  const classesById = new Map(allClasses.map((c) => [c.id, c]));

  const sortedMappings = [...allMappings].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "description":
        cmp = a.description.localeCompare(b.description);
        break;
      case "check_type":
        cmp = checkTypeLabels[a.check_type].localeCompare(checkTypeLabels[b.check_type]);
        break;
      case "category": {
        const aName = categoriesById.get(a.category_id)?.name ?? "";
        const bName = categoriesById.get(b.category_id)?.name ?? "";
        cmp = aName.localeCompare(bName);
        break;
      }
      case "class": {
        const aName = (a.class_id ? classesById.get(a.class_id)?.name : undefined) ?? "";
        const bName = (b.class_id ? classesById.get(b.class_id)?.name : undefined) ?? "";
        cmp = aName.localeCompare(bName);
        break;
      }
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Descriptions</h1>
        <SyncButton />
      </div>

      {allCategories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories yet. Create one on the Categories page first.
        </p>
      ) : (
        <DescriptionsTable
          mappings={sortedMappings}
          categories={allCategories}
          classes={allClasses}
          sortKey={sortKey}
          sortDir={sortDir}
        />
      )}
    </div>
  );
}
