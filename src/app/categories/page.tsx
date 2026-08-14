import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/supabase/types";
import { AddCategoryDialog } from "./add-category-dialog";
import { CategoryRowActions } from "./category-row-actions";

function CategoryGroup({ title, categories }: { title: string; categories: Category[] }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-medium">{title}</h2>
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span>{category.name}</span>
              </div>
              <CategoryRowActions category={category} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);

  const all = (categories ?? []) as Category[];
  const income = all.filter((c) => c.kind === "income");
  const expense = all.filter((c) => c.kind === "expense");
  const transfer = all.filter((c) => c.kind === "transfer");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <AddCategoryDialog />
      </div>
      <CategoryGroup title="Income" categories={income} />
      <CategoryGroup title="Expense" categories={expense} />
      <CategoryGroup title="Transfer" categories={transfer} />
    </div>
  );
}
