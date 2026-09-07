import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/supabase/types";
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
import { AddCategoryDialog } from "./add-category-dialog";
import { CategoryRowActions } from "./category-row-actions";

const kindLabels: Record<Category["kind"], string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

const SORT_KEYS = ["name", "type"] as const;
type SortKey = (typeof SORT_KEYS)[number];

function isSortKey(value: string | undefined): value is SortKey {
  return !!value && (SORT_KEYS as readonly string[]).includes(value);
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { sort: sortParam, dir: dirParam } = await searchParams;
  const sortKey: SortKey = isSortKey(sortParam) ? sortParam : "name";
  const sortDir: "asc" | "desc" = dirParam === "desc" ? "desc" : "asc";

  function sortHref(column: SortKey) {
    const nextDir: "asc" | "desc" = sortKey === column && sortDir === "asc" ? "desc" : "asc";
    return `/categories?${new URLSearchParams({ sort: column, dir: nextDir }).toString()}`;
  }

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

      {sortedCategories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet.</p>
      ) : (
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[50%]" />
            <col className="w-[30%]" />
            <col className="w-[20%]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <SortableTableHead href={sortHref("name")} active={sortKey === "name"} dir={sortDir}>
                Name
              </SortableTableHead>
              <SortableTableHead href={sortHref("type")} active={sortKey === "type"} dir={sortDir}>
                Type
              </SortableTableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCategories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="truncate font-medium" title={category.name}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate">{category.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{kindLabels[category.kind]}</Badge>
                </TableCell>
                <TableCell>
                  <CategoryRowActions category={category} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
