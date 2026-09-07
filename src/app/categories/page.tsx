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
import { AddCategoryDialog } from "./add-category-dialog";
import { CategoryRowActions } from "./category-row-actions";

const kindLabels: Record<Category["kind"], string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("*")
    .order("kind")
    .order("name");

  if (error) throw new Error(error.message);

  const allCategories = (categories ?? []) as Category[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <AddCategoryDialog />
      </div>

      {allCategories.length === 0 ? (
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
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {allCategories.map((category) => (
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
