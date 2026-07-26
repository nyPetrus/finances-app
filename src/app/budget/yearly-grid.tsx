import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/supabase/types";
import { saveBudgetYear } from "./actions";

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(2000, i, 1)),
);

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function YearlyGrid({
  year,
  categories,
  plannedByCategory,
}: {
  year: number;
  categories: Category[];
  plannedByCategory: Map<string, number[]>;
}) {
  if (categories.length === 0) {
    return <p className="text-sm text-muted-foreground">Create a category first to plan a budget.</p>;
  }

  const monthTotals = Array.from({ length: 12 }, (_, month) =>
    categories.reduce((sum, c) => sum + (plannedByCategory.get(c.id)?.[month] ?? 0), 0),
  );

  return (
    <form action={saveBudgetYear} className="flex flex-col gap-4">
      <input type="hidden" name="year" value={year} />
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 bg-muted/50 px-3 py-2 text-left font-medium">Category</th>
              {MONTH_LABELS.map((label) => (
                <th key={label} className="px-1 py-2 text-center font-medium capitalize">
                  {label}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const months = plannedByCategory.get(category.id) ?? Array(12).fill(0);
              const total = months.reduce((a, b) => a + b, 0);
              return (
                <tr key={category.id} className="border-b last:border-0">
                  <td className="sticky left-0 flex items-center gap-2 bg-background px-3 py-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </td>
                  {months.map((amount, month) => (
                    <td key={month} className="px-1 py-1">
                      <Input
                        type="number"
                        step="0.01"
                        name={`amount__${category.id}__${month + 1}`}
                        defaultValue={amount || ""}
                        placeholder="0"
                        className="h-8 w-20 text-right"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(total)}</td>
                </tr>
              );
            })}
            <tr className="bg-muted/30 font-medium">
              <td className="sticky left-0 bg-muted/30 px-3 py-2">Total</td>
              {monthTotals.map((total, month) => (
                <td key={month} className="px-1 py-2 text-center">
                  {formatCurrency(total)}
                </td>
              ))}
              <td className="px-3 py-2 text-right">
                {formatCurrency(monthTotals.reduce((a, b) => a + b, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Button type="submit" className="self-start">
        Save budget
      </Button>
    </form>
  );
}
