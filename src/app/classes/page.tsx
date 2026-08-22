import { createClient } from "@/lib/supabase/server";
import type { Category, Class } from "@/lib/supabase/types";
import { AddClassDialog } from "./add-class-dialog";
import { ClassRowActions } from "./class-row-actions";

function CategoryGroup({
  category,
  classes,
  categories,
}: {
  category: Category;
  classes: Class[];
  categories: Category[];
}) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-medium">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: category.color }}
        />
        {category.name}
      </h2>
      {classes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No classes yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {classes.map((classItem) => (
            <li key={classItem.id} className="flex items-center justify-between px-4 py-3">
              <span>{classItem.name}</span>
              <ClassRowActions classItem={classItem} categories={categories} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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

  const classesByCategory = new Map<string, Class[]>();
  for (const classItem of allClasses) {
    const list = classesByCategory.get(classItem.category_id) ?? [];
    list.push(classItem);
    classesByCategory.set(classItem.category_id, list);
  }

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
      ) : (
        <div className="flex flex-col gap-6">
          {allCategories.map((category) => (
            <CategoryGroup
              key={category.id}
              category={category}
              classes={classesByCategory.get(category.id) ?? []}
              categories={allCategories}
            />
          ))}
        </div>
      )}
    </div>
  );
}
