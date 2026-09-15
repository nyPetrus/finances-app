import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchAllTransactionsInRange } from "@/lib/supabase/fetch-all-transactions";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { EXPENSE_HUE, sequentialColor } from "@/lib/chart-colors";
import { DashboardExplorer } from "./dashboard-explorer";

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

  const accountsTotal = allAccounts.reduce((sum, a) => sum + a.current_balance, 0);

  const nonTransferYearTransactions = yearTransactions.filter(
    (t) => !isTransfer(t),
  );

  // Income/Expenses are classified by the transaction's own category kind,
  // not by amount sign — a transaction with no category at all falls under
  // the separate Uncategorized stat instead of either of these.
  const incomeTotal = yearTransactions.reduce((sum, t) => {
    if (!t.category_id || categoriesById.get(t.category_id)?.kind !== "income") return sum;
    return sum + t.amount;
  }, 0);
  const expensesTotal = yearTransactions.reduce((sum, t) => {
    if (!t.category_id || categoriesById.get(t.category_id)?.kind !== "expense") return sum;
    return sum + t.amount;
  }, 0);
  const balanceTotal = incomeTotal + expensesTotal;
  const transfersTotal = yearTransactions.reduce(
    (sum, t) => (isTransfer(t) ? sum + Math.abs(t.amount) : sum),
    0,
  );
  const uncategorizedTotal = yearTransactions.reduce(
    (sum, t) => (t.category_id ? sum : sum + t.amount),
    0,
  );

  const expensesByCategory = new Map<string, number>();
  for (const t of nonTransferYearTransactions) {
    if (t.amount >= 0) continue;
    if (t.category_id && categoriesById.get(t.category_id)?.kind !== "expense") continue;
    const key = t.category_id ?? "uncategorized";
    expensesByCategory.set(key, (expensesByCategory.get(key) ?? 0) + -t.amount);
  }

  const expensesChartData = buildCategoryChartData(expensesByCategory, categoriesById, EXPENSE_HUE);

  const expensesByMonth = Array(12).fill(0);
  for (const t of yearTransactions) {
    if (!t.category_id || categoriesById.get(t.category_id)?.kind !== "expense") continue;
    const month = Number(t.date.slice(5, 7)) - 1;
    expensesByMonth[month] += -t.amount;
  }
  const monthlyChartData = MONTH_LABELS.map((label, i) => ({
    month: label,
    expenses: expensesByMonth[i],
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

      <DashboardExplorer
        transactions={yearTransactions}
        accounts={allAccounts}
        categories={allCategories}
        classes={allClasses}
        stats={{
          income: incomeTotal,
          expenses: expensesTotal,
          balance: balanceTotal,
          accounts: accountsTotal,
          transfers: transfersTotal,
          uncategorized: uncategorizedTotal,
        }}
        monthlyData={monthlyChartData}
        expensesData={expensesChartData}
      />
    </div>
  );
}
