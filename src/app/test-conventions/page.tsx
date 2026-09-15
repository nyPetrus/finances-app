import { createClient } from "@/lib/supabase/server";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";
import { AccountsTable } from "@/app/accounts/accounts-table";
import { CategoriesTable } from "@/app/categories/categories-table";
import { ClassesTable } from "@/app/classes/classes-table";
import { TransactionsTable } from "@/app/transactions/transactions-table";

// Reuses each page's own <X>Table component (rather than re-deriving
// Add/Delete/Columns/row-actions from scratch) so this page tests the exact
// same conventions the real pages use, on a capped slice of real data. Note:
// each table's sort headers still link to its own page (/accounts,
// /categories, ...) — that's baked into the shared components — so sorting
// here navigates away rather than reordering in place.
const ROW_LIMIT = 20;

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function TestConventionsPage() {
  const supabase = await createClient();

  const [
    { data: allCategories, error: catError },
    { data: allClasses, error: classError },
    { data: allAccounts, error: accError },
    { data: recentTransactions, error: txError },
  ] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("classes").select("*").order("name"),
    supabase.from("accounts").select("*").order("name"),
    supabase.from("transactions").select("*").order("date", { ascending: false }).limit(ROW_LIMIT),
  ]);

  if (catError) throw new Error(catError.message);
  if (classError) throw new Error(classError.message);
  if (accError) throw new Error(accError.message);
  if (txError) throw new Error(txError.message);

  const categories = (allCategories ?? []) as Category[];
  const classes = (allClasses ?? []) as Class[];
  const accounts = (allAccounts ?? []) as Account[];
  const transactions = (recentTransactions ?? []) as Transaction[];

  const displayCategories = categories.slice(0, ROW_LIMIT);
  const displayClasses = classes.slice(0, ROW_LIMIT);
  const displayAccounts = accounts.slice(0, ROW_LIMIT);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Test Conventios</h1>
        <p className="text-sm text-muted-foreground">
          Up to {ROW_LIMIT} rows per table, rendered with each page&apos;s own
          table component (Add/Delete/Columns included), to sanity-check the
          conventions documented in .claude/skills against real data.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Transactions</h2>
        <TransactionsTable
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          classes={classes}
          sortKey="date"
          sortDir="desc"
          monthKey={currentMonthKey()}
          emptyMessage="No transactions yet."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Categories</h2>
        <CategoriesTable categories={displayCategories} sortKey="name" sortDir="asc" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Classes</h2>
        <ClassesTable classes={displayClasses} categories={categories} sortKey="name" sortDir="asc" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Accounts</h2>
        <AccountsTable accounts={displayAccounts} sortKey="name" sortDir="asc" />
      </section>
    </div>
  );
}
