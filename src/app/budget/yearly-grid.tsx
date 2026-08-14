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
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[15%]" />
            {MONTH_LABELS.map((label) => (
              <col key={label} className="w-[6%]" />
            ))}
            <col className="w-[13%]" />
          </colgroup>
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="bg-muted/50 px-2 py-2 text-left text-xs font-medium">Category</th>
              {MONTH_LABELS.map((label) => (
                <th key={label} className="px-0.5 py-2 text-center text-xs font-medium capitalize">
                  {label}
                </th>
              ))}
              <th className="px-2 py-2 text-right text-xs font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const months = plannedByCategory.get(category.id) ?? Array(12).fill(0);
              const total = months.reduce((a, b) => a + b, 0);
              return (
                <tr key={category.id} className="border-b last:border-0">
                  <td className="overflow-hidden bg-background px-2 py-2">
                    <div className="flex items-center gap-2 truncate" title={category.name}>
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="truncate">{category.name}</span>
                    </div>
                  </td>
                  {months.map((amount, month) => (
                    <td key={month} className="px-0.5 py-1">
                      <Input
                        type="number"
                        step="0.01"
                        name={`amount__${category.id}__${month + 1}`}
                        defaultValue={amount || ""}
                        placeholder="0"
                        className="h-8 w-full px-1 text-right text-xs"
                      />
                    </td>
                  ))}
                  <td className="truncate px-2 py-2 text-right text-xs font-medium">
                    {formatCurrency(total)}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-muted/30 font-medium">
              <td className="bg-muted/30 px-2 py-2 text-xs">Total</td>
              {monthTotals.map((total, month) => (
                <td key={month} className="truncate px-0.5 py-2 text-center text-xs">
                  {formatCurrency(total)}
                </td>
              ))}
              <td className="truncate px-2 py-2 text-right text-xs">
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
