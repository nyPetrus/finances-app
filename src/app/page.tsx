import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchAllTransactionsInRange } from "@/lib/supabase/fetch-all-transactions";
import { fetchClasses } from "@/lib/supabase/fetch-classes";
import type { Account, Category } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { DashboardExplorer } from "./dashboard-explorer";

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
    allClasses,
    yearTransactions,
  ] = await Promise.all([
    supabase.from("accounts").select("*"),
    supabase.from("categories").select("*"),
    fetchClasses(supabase),
    fetchAllTransactionsInRange(supabase, `${year}-01-01`, `${year + 1}-01-01`),
  ]);

  if (accError) throw new Error(accError.message);
  if (catError) throw new Error(catError.message);

  const allAccounts = (accounts ?? []) as Account[];
  const allCategories = (categories ?? []) as Category[];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
      {/* Phones: this row collapses away — the title is screen-reader-only
          and the year moves into the explorer's combined month/year stepper. */}
      <div className="flex items-center justify-between max-sm:contents">
        <h1 className="text-2xl font-semibold max-md:sr-only">Dashboard</h1>
        <div className="flex items-center gap-2 max-sm:hidden">
          <Button
            variant="outline"
            size="sm"
            aria-label={`Previous year (${year - 1})`}
            title={`Previous year (${year - 1})`}
            render={<Link href={`/?year=${year - 1}`} />}
          >
            &lt;
          </Button>
          <span className="w-16 text-center font-medium">{year}</span>
          <Button
            variant="outline"
            size="sm"
            aria-label={`Next year (${year + 1})`}
            title={`Next year (${year + 1})`}
            render={<Link href={`/?year=${year + 1}`} />}
          >
            &gt;
          </Button>
        </div>
      </div>

      <DashboardExplorer
        year={year}
        transactions={yearTransactions}
        accounts={allAccounts}
        categories={allCategories}
        classes={allClasses}
      />
    </div>
  );
}
