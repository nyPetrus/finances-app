import { createClient } from "@/lib/supabase/server";
import type { Account, BudgetItem, Category, Transaction } from "@/lib/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BudgetVsActualChart } from "./budget-vs-actual-chart";
import { SpendingByCategoryChart } from "./spending-by-category-chart";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(2000, i, 1)),
);

export default async function Home() {
  const supabase = await createClient();
  const now = new Date();
  const year = now.getFullYear();
  const monthStart = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(year, now.getMonth() + 1, 1);
  const monthEnd = nextMonth.toISOString().slice(0, 10);

  const [
    { data: accounts, error: accError },
    { data: monthTransactions, error: txError },
    { data: categories, error: catError },
    { data: budgetItems, error: budgetError },
    { data: yearTransactions, error: yearTxError },
  ] = await Promise.all([
    supabase.from("accounts").select("*"),
    supabase.from("transactions").select("*").gte("date", monthStart).lt("date", monthEnd),
    supabase.from("categories").select("*"),
    supabase.from("budget_items").select("*").eq("year", year),
    supabase
      .from("transactions")
      .select("*")
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`),
  ]);

  if (accError) throw new Error(accError.message);
  if (txError) throw new Error(txError.message);
  if (catError) throw new Error(catError.message);
  if (budgetError) throw new Error(budgetError.message);
  if (yearTxError) throw new Error(yearTxError.message);

  const allAccounts = (accounts ?? []) as Account[];
  const allCategories = (categories ?? []) as Category[];
  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));

  const totalBalance = allAccounts.reduce((sum, a) => sum + a.current_balance, 0);

  const income = (monthTransactions ?? [])
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = (monthTransactions ?? [])
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const net = income + expenses;

  const spendingByCategory = new Map<string, number>();
  for (const t of (monthTransactions ?? []) as Transaction[]) {
    if (t.amount >= 0 || !t.category_id) continue;
    spendingByCategory.set(t.category_id, (spendingByCategory.get(t.category_id) ?? 0) + -t.amount);
  }
  const spendingChartData = Array.from(spendingByCategory.entries())
    .map(([categoryId, amount]) => ({
      name: categoriesById.get(categoryId)?.name ?? "Unknown",
      color: categoriesById.get(categoryId)?.color ?? "#898781",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const plannedByMonth = Array(12).fill(0);
  for (const item of (budgetItems ?? []) as BudgetItem[]) {
    plannedByMonth[item.month - 1] += item.planned_amount;
  }
  const actualByMonth = Array(12).fill(0);
  for (const t of (yearTransactions ?? []) as Transaction[]) {
    if (t.amount >= 0) continue;
    const month = Number(t.date.slice(5, 7));
    actualByMonth[month - 1] += -t.amount;
  }
  const budgetChartData = MONTH_LABELS.map((label, i) => ({
    month: label,
    planned: plannedByMonth[i],
    actual: actualByMonth[i],
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Total balance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatCurrency(totalBalance)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Income (this month)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-emerald-600">
            {formatCurrency(income)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Expenses (this month)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-destructive">
            {formatCurrency(expenses)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Net (this month)
            </CardTitle>
          </CardHeader>
          <CardContent
            className={`text-xl font-semibold ${net >= 0 ? "text-emerald-600" : "text-destructive"}`}
          >
            {formatCurrency(net)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget vs actual — {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetVsActualChart data={budgetChartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spending by category — this month</CardTitle>
        </CardHeader>
        <CardContent>
          {spendingChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categorized expenses yet this month.</p>
          ) : (
            <SpendingByCategoryChart data={spendingChartData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
