import { createClient } from "@/lib/supabase/server";
import type { Category, Class, MappedDescription } from "@/lib/supabase/types";
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
import { AddMappingDialog } from "./add-mapping-dialog";
import { MappingRowActions } from "./mapping-row-actions";
import { SyncButton } from "./sync-button";

const checkTypeLabels: Record<MappedDescription["check_type"], string> = {
  equal_to: "Equal to",
  starts_with: "Starts with",
  contains: "Contains",
};

const SORT_KEYS = ["description", "check_type", "category", "class"] as const;
type SortKey = (typeof SORT_KEYS)[number];

function isSortKey(value: string | undefined): value is SortKey {
  return !!value && (SORT_KEYS as readonly string[]).includes(value);
}

export default async function DescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { sort: sortParam, dir: dirParam } = await searchParams;
  const sortKey: SortKey = isSortKey(sortParam) ? sortParam : "description";
  const sortDir: "asc" | "desc" = dirParam === "desc" ? "desc" : "asc";

  function sortHref(column: SortKey) {
    const nextDir: "asc" | "desc" = sortKey === column && sortDir === "asc" ? "desc" : "asc";
    return `/descriptions?${new URLSearchParams({ sort: column, dir: nextDir }).toString()}`;
  }

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
        <div className="flex items-center gap-2">
          <SyncButton />
          {allCategories.length > 0 && <AddMappingDialog categories={allCategories} classes={allClasses} />}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Map a transaction description to a category (and optionally a class), matched as an exact
        equal, a prefix, or a substring. Press Sync to auto-categorize any uncategorized
        transactions that match — exact matches are applied first, then prefixes, then substrings.
      </p>

      {allCategories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories yet. Create one on the Categories page first.
        </p>
      ) : sortedMappings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No mapped descriptions yet.</p>
      ) : (
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[16%]" />
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[18%]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <SortableTableHead href={sortHref("description")} active={sortKey === "description"} dir={sortDir}>
                Description
              </SortableTableHead>
              <SortableTableHead href={sortHref("check_type")} active={sortKey === "check_type"} dir={sortDir}>
                Check type
              </SortableTableHead>
              <SortableTableHead href={sortHref("category")} active={sortKey === "category"} dir={sortDir}>
                Category
              </SortableTableHead>
              <SortableTableHead href={sortHref("class")} active={sortKey === "class"} dir={sortDir}>
                Class
              </SortableTableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMappings.map((mapping) => {
              const category = categoriesById.get(mapping.category_id);
              const classItem = mapping.class_id ? classesById.get(mapping.class_id) : null;
              return (
                <TableRow key={mapping.description}>
                  <TableCell className="truncate" title={mapping.description}>
                    {mapping.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{checkTypeLabels[mapping.check_type]}</Badge>
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
                  <TableCell className="truncate" title={classItem?.name}>
                    {classItem?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <MappingRowActions mapping={mapping} categories={allCategories} classes={allClasses} />
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
