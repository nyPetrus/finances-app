import { createClient } from "@/lib/supabase/server";
import type { Category, Class } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/category-icon";
import { ColumnHeaderIcon } from "@/components/column-header-icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TagIcon, TagsIcon } from "lucide-react";

// One row per existing Class, joined to its parent Category — this only
// surfaces combinations that already exist (a Category with no Classes
// yet has no row here at all).
const kindLabels: Record<Category["kind"], string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

const KIND_ORDER: Category["kind"][] = ["income", "expense", "transfer"];

export default async function CombinationsPage() {
  const supabase = await createClient();

  const [
    { data: allCategories, error: catError },
    { data: allClasses, error: classError },
  ] = await Promise.all([
    supabase.from("categories").select("*"),
    supabase.from("classes").select("*"),
  ]);

  if (catError) throw new Error(catError.message);
  if (classError) throw new Error(classError.message);

  const categories = (allCategories ?? []) as Category[];
  const classes = (allClasses ?? []) as Class[];
  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  const combinations = classes
    .map((classItem) => ({
      classItem,
      category: categoriesById.get(classItem.category_id),
    }))
    .filter((row): row is { classItem: Class; category: Category } => !!row.category)
    .sort((a, b) => {
      return (
        KIND_ORDER.indexOf(a.category.kind) - KIND_ORDER.indexOf(b.category.kind) ||
        a.category.name.localeCompare(b.category.name) ||
        a.classItem.name.localeCompare(b.classItem.name)
      );
    });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Combinations</h1>

      {combinations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No classes yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>
                <ColumnHeaderIcon icon={TagIcon} label="Category" />
              </TableHead>
              <TableHead>
                <ColumnHeaderIcon icon={TagsIcon} label="Class" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {combinations.map(({ classItem, category }) => (
              <TableRow key={classItem.id}>
                <TableCell>
                  <Badge variant="secondary">{kindLabels[category.kind]}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <CategoryIcon icon={category.icon} className="size-4 shrink-0 text-muted-foreground" />
                    <span>{category.name}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{classItem.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
