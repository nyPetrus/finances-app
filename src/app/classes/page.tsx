import { createClient } from "@/lib/supabase/server";
import type { Category, Class } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableTableHead } from "@/components/sortable-table-head";
import { AddClassDialog } from "./add-class-dialog";
import { ClassRowActions } from "./class-row-actions";

const SORT_KEYS = ["name", "category"] as const;
type SortKey = (typeof SORT_KEYS)[number];

function isSortKey(value: string | undefined): value is SortKey {
  return !!value && (SORT_KEYS as readonly string[]).includes(value);
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { sort: sortParam, dir: dirParam } = await searchParams;
  const sortKey: SortKey = isSortKey(sortParam) ? sortParam : "name";
  const sortDir: "asc" | "desc" = dirParam === "desc" ? "desc" : "asc";

  function sortHref(column: SortKey) {
    const nextDir: "asc" | "desc" = sortKey === column && sortDir === "asc" ? "desc" : "asc";
    return `/classes?${new URLSearchParams({ sort: column, dir: nextDir }).toString()}`;
  }

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
      ) : sortedClasses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No classes yet.</p>
      ) : (
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[45%]" />
            <col className="w-[35%]" />
            <col className="w-[20%]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <SortableTableHead href={sortHref("name")} active={sortKey === "name"} dir={sortDir}>
                Name
              </SortableTableHead>
              <SortableTableHead href={sortHref("category")} active={sortKey === "category"} dir={sortDir}>
                Category
              </SortableTableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClasses.map((classItem) => {
              const category = categoriesById.get(classItem.category_id);
              return (
                <TableRow key={classItem.id}>
                  <TableCell className="truncate font-medium" title={classItem.name}>
                    {classItem.name}
                  </TableCell>
                  <TableCell className="overflow-hidden">
                    {category ? (
                      <Badge
                        variant="secondary"
                        className="max-w-full truncate"
                        style={{ backgroundColor: `${category.color}22`, color: category.color }}
                      >
                        {category.name}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ClassRowActions classItem={classItem} categories={allCategories} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
