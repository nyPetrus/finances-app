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
import { AddClassDialog } from "./add-class-dialog";
import { ClassRowActions } from "./class-row-actions";

export default async function ClassesPage() {
  const supabase = await createClient();
  const [{ data: categories, error: catError }, { data: classes, error: classError }] =
    await Promise.all([
      supabase.from("categories").select("*").order("kind").order("name"),
      supabase.from("classes").select("*").order("name"),
    ]);

  if (catError) throw new Error(catError.message);
  if (classError) throw new Error(classError.message);

  const allCategories = (categories ?? []) as Category[];
  const allClasses = (classes ?? []) as Class[];

  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));

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
      ) : allClasses.length === 0 ? (
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
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {allClasses.map((classItem) => {
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
