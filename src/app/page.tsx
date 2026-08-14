import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Account, BudgetItem, Category, Transaction } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BudgetVsActualChart } from "./budget-vs-actual-chart";
import { SpendingByCategoryChart } from "./spending-by-category-chart";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(2000, i, 1)),
);

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();

  const supabase = await createClient();

  const [
    { data: accounts, error: accError },
    { data: categories, error: catError },
    { data: budgetItems, error: budgetError },
    { data: yearTransactions, error: yearTxError },
  ] = await Promise.all([
    supabase.from("accounts").select("*"),
    supabase.from("categories").select("*"),
    supabase.from("budget_items").select("*").eq("year", year),
    supabase
      .from("transactions")
      .select("*")
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`),
  ]);

  if (accError) throw new Error(accError.message);
  if (catError) throw new Error(catError.message);
  if (budgetError) throw new Error(budgetError.message);
  if (yearTxError) throw new Error(yearTxError.message);

  const allAccounts = (accounts ?? []) as Account[];
  const allCategories = (categories ?? []) as Category[];
  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));

  function isTransfer(t: Transaction) {
    return !!t.category_id && categoriesById.get(t.category_id)?.kind === "transfer";
  }

  const totalBalance = allAccounts.reduce((sum, a) => sum + a.current_balance, 0);

  const nonTransferYearTransactions = ((yearTransactions ?? []) as Transaction[]).filter(
    (t) => !isTransfer(t),
  );

  const income = nonTransferYearTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = nonTransferYearTransactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const net = income + expenses;

  const spendingByCategory = new Map<string, number>();
  for (const t of nonTransferYearTransactions) {
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
    if (t.amount >= 0 || isTransfer(t)) continue;
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/?year=${year - 1}`} />}>
            ← {year - 1}
          </Button>
          <span className="w-16 text-center font-medium">{year}</span>
          <Button variant="outline" size="sm" render={<Link href={`/?year=${year + 1}`} />}>
            {year + 1} →
          </Button>
        </div>
      </div>

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
              Income ({year})
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-emerald-600">
            {formatCurrency(income)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Expenses ({year})
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-destructive">
            {formatCurrency(expenses)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Net ({year})
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
          <CardTitle>Spending by category — {year}</CardTitle>
        </CardHeader>
        <CardContent>
          {spendingChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categorized expenses yet in {year}.</p>
          ) : (
            <SpendingByCategoryChart data={spendingChartData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
