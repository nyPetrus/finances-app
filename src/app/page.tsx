import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchAllTransactionsInRange } from "@/lib/supabase/fetch-all-transactions";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXPENSE_HUE, INCOME_HUE, TRANSFER_HUE, sequentialColor } from "@/lib/chart-colors";
import { IncomeExpensesTransfersChart } from "./income-expenses-transfers-chart";
import { DashboardCategoryExplorer } from "./dashboard-category-explorer";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(2000, i, 1)),
);

function buildCategoryChartData(
  amountsByKey: Map<string, number>,
  categoriesById: Map<string, Category>,
  hue: { h: number; c: number },
) {
  const entries = Array.from(amountsByKey.entries())
    .map(([key, amount]) => ({
      key,
      name: key === "uncategorized" ? "Uncategorized" : (categoriesById.get(key)?.name ?? "Unknown"),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
  return entries.map((entry, i) => ({
    ...entry,
    color: sequentialColor(hue, i, entries.length),
  }));
}

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
    { data: classes, error: classError },
    yearTransactions,
  ] = await Promise.all([
    supabase.from("accounts").select("*"),
    supabase.from("categories").select("*"),
    supabase.from("classes").select("*"),
    fetchAllTransactionsInRange(supabase, `${year}-01-01`, `${year + 1}-01-01`),
  ]);

  if (accError) throw new Error(accError.message);
  if (catError) throw new Error(catError.message);
  if (classError) throw new Error(classError.message);

  const allAccounts = (accounts ?? []) as Account[];
  const allCategories = (categories ?? []) as Category[];
  const allClasses = (classes ?? []) as Class[];
  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));

  function isTransfer(t: Transaction) {
    return !!t.category_id && categoriesById.get(t.category_id)?.kind === "transfer";
  }

  const totalBalance = allAccounts.reduce((sum, a) => sum + a.current_balance, 0);

  const nonTransferYearTransactions = yearTransactions.filter(
    (t) => !isTransfer(t),
  );

  const income = nonTransferYearTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = nonTransferYearTransactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const net = income + expenses;

  const expensesByCategory = new Map<string, number>();
  const incomeByCategory = new Map<string, number>();
  for (const t of nonTransferYearTransactions) {
    const key = t.category_id ?? "uncategorized";
    if (t.amount < 0) {
      if (t.category_id && categoriesById.get(t.category_id)?.kind !== "expense") continue;
      expensesByCategory.set(key, (expensesByCategory.get(key) ?? 0) + -t.amount);
    } else if (t.amount > 0) {
      if (t.category_id && categoriesById.get(t.category_id)?.kind !== "income") continue;
      incomeByCategory.set(key, (incomeByCategory.get(key) ?? 0) + t.amount);
    }
  }

  const transferByCategory = new Map<string, number>();
  for (const t of yearTransactions) {
    if (!isTransfer(t) || !t.category_id) continue;
    transferByCategory.set(t.category_id, (transferByCategory.get(t.category_id) ?? 0) + Math.abs(t.amount));
  }

  const expensesChartData = buildCategoryChartData(expensesByCategory, categoriesById, EXPENSE_HUE);
  const incomeChartData = buildCategoryChartData(incomeByCategory, categoriesById, INCOME_HUE);
  const transferChartData = buildCategoryChartData(transferByCategory, categoriesById, TRANSFER_HUE);

  const incomeByMonth = Array(12).fill(0);
  const expensesByMonth = Array(12).fill(0);
  const transfersByMonth = Array(12).fill(0);
  for (const t of yearTransactions) {
    const month = Number(t.date.slice(5, 7)) - 1;
    if (isTransfer(t)) {
      transfersByMonth[month] += Math.abs(t.amount);
    } else if (t.amount > 0) {
      incomeByMonth[month] += t.amount;
    } else {
      expensesByMonth[month] += -t.amount;
    }
  }
  const monthlyChartData = MONTH_LABELS.map((label, i) => ({
    month: label,
    income: incomeByMonth[i],
    expenses: expensesByMonth[i],
    transfers: transfersByMonth[i],
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
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatCurrency(totalBalance)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Income
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-emerald-600">
            {formatCurrency(income)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-destructive">
            {formatCurrency(expenses)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Net
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
          <CardTitle>Income x Expenses x Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          <IncomeExpensesTransfersChart data={monthlyChartData} />
        </CardContent>
      </Card>

      <DashboardCategoryExplorer
        transactions={yearTransactions}
        accounts={allAccounts}
        categories={allCategories}
        classes={allClasses}
        expensesData={expensesChartData}
        incomeData={incomeChartData}
        transferData={transferChartData}
      />
    </div>
  );
}
