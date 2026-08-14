import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { BudgetItem, Category, Transaction } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YearlyGrid } from "./yearly-grid";
import { MonthlyExecution } from "./monthly-execution";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();

  const supabase = await createClient();

  const [{ data: categories, error: catError }, { data: budgetItems, error: budgetError }, { data: transactions, error: txError }] =
    await Promise.all([
      supabase.from("categories").select("*").order("kind").order("name"),
      supabase.from("budget_items").select("*").eq("year", year),
      supabase
        .from("transactions")
        .select("*")
        .gte("date", `${year}-01-01`)
        .lte("date", `${year}-12-31`),
    ]);

  if (catError) throw new Error(catError.message);
  if (budgetError) throw new Error(budgetError.message);
  if (txError) throw new Error(txError.message);

  // Transfers between the user's own accounts (e.g. a credit card bill
  // payment) aren't income or expense, so they're excluded from budgeting.
  const allCategories = (categories ?? []).filter((c) => c.kind !== "transfer") as Category[];
  const allBudgetItems = (budgetItems ?? []) as BudgetItem[];
  const allTransactions = (transactions ?? []) as Transaction[];

  const plannedByCategory = new Map<string, number[]>();
  for (const item of allBudgetItems) {
    const months = plannedByCategory.get(item.category_id) ?? Array(12).fill(0);
    months[item.month - 1] = item.planned_amount;
    plannedByCategory.set(item.category_id, months);
  }

  const actualByCategory = new Map<string, number[]>();
  for (const transaction of allTransactions) {
    if (!transaction.category_id) continue;
    const month = Number(transaction.date.slice(5, 7));
    const months = actualByCategory.get(transaction.category_id) ?? Array(12).fill(0);
    months[month - 1] += transaction.amount;
    actualByCategory.set(transaction.category_id, months);
  }

  const defaultMonth = year === now.getFullYear() ? now.getMonth() + 1 : 1;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Budget</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/budget?year=${year - 1}`} />}>
            ← {year - 1}
          </Button>
          <span className="w-16 text-center font-medium">{year}</span>
          <Button variant="outline" size="sm" render={<Link href={`/budget?year=${year + 1}`} />}>
            {year + 1} →
          </Button>
        </div>
      </div>

      <Tabs defaultValue="yearly">
        <TabsList>
          <TabsTrigger value="yearly">Yearly plan</TabsTrigger>
          <TabsTrigger value="execution">Monthly execution</TabsTrigger>
        </TabsList>
        <TabsContent value="yearly" className="pt-4">
          <YearlyGrid year={year} categories={allCategories} plannedByCategory={plannedByCategory} />
        </TabsContent>
        <TabsContent value="execution" className="pt-4">
          <MonthlyExecution
            defaultMonth={defaultMonth}
            categories={allCategories}
            plannedByCategory={plannedByCategory}
            actualByCategory={actualByCategory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
