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
import { AddMappingDialog } from "./add-mapping-dialog";
import { MappingRowActions } from "./mapping-row-actions";
import { SyncButton } from "./sync-button";

export default async function DescriptionsPage() {
  const supabase = await createClient();

  const [
    { data: categories, error: catError },
    { data: classes, error: classError },
    { data: mappings, error: mapError },
  ] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("classes").select("*").order("name"),
    supabase.from("mapped_descriptions").select("*").order("description"),
  ]);

  if (catError) throw new Error(catError.message);
  if (classError) throw new Error(classError.message);
  if (mapError) throw new Error(mapError.message);

  const allCategories = (categories ?? []) as Category[];
  const allClasses = (classes ?? []) as Class[];
  const allMappings = (mappings ?? []) as MappedDescription[];

  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));
  const classesById = new Map(allClasses.map((c) => [c.id, c]));

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
        Map an exact transaction description to a category (and optionally a class). Press Sync to
        auto-categorize any uncategorized transactions whose description matches one of these.
      </p>

      {allCategories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories yet. Create one on the Categories page first.
        </p>
      ) : allMappings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No mapped descriptions yet.</p>
      ) : (
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[46%]" />
            <col className="w-[22%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Class</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {allMappings.map((mapping) => {
              const category = categoriesById.get(mapping.category_id);
              const classItem = mapping.class_id ? classesById.get(mapping.class_id) : null;
              return (
                <TableRow key={mapping.description}>
                  <TableCell className="truncate" title={mapping.description}>
                    {mapping.description}
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
