import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { AccountFilter } from "./account-filter";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { MonthPicker } from "./month-picker";
import { TransactionsTable } from "./transactions-table";
import { isSortKey, type SortKey } from "./sort";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const MONTH_ABBREVIATIONS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function formatMonthShort(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTH_ABBREVIATIONS[month - 1]}/${year}`;
}

function shiftMonth(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; account?: string; sort?: string; dir?: string; hidden?: string }>;
}) {
  const { month: monthParam, account: accountParam, sort: sortParam, dir: dirParam, hidden: hiddenParam } =
    await searchParams;
  const monthKey = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonthKey();
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${shiftMonth(monthKey, 1)}-01`;
  const previousMonthKey = shiftMonth(monthKey, -1);
  const nextMonthKey = shiftMonth(monthKey, 1);
  const sortKey: SortKey = isSortKey(sortParam) ? sortParam : "date";
  const sortDir: "asc" | "desc" = dirParam === "asc" ? "asc" : "desc";
  const showHidden = hiddenParam === "1";

  function buildHref(overrides: { month?: string; sort?: SortKey; dir?: "asc" | "desc" } = {}) {
    const params = new URLSearchParams({ month: overrides.month ?? monthKey });
    if (accountParam) params.set("account", accountParam);
    if (showHidden) params.set("hidden", "1");
    const nextSort = overrides.sort ?? (isSortKey(sortParam) ? sortParam : undefined);
    const nextDir = overrides.dir ?? (isSortKey(sortParam) ? sortDir : undefined);
    if (nextSort) params.set("sort", nextSort);
    if (nextSort && nextDir) params.set("dir", nextDir);
    return `/transactions?${params.toString()}`;
  }

  function toggleHiddenHref() {
    const params = new URLSearchParams({ month: monthKey });
    if (accountParam) params.set("account", accountParam);
    if (!showHidden) params.set("hidden", "1");
    return `/transactions?${params.toString()}`;
  }

  const supabase = await createClient();

  let transactionsQuery = supabase
    .from("transactions")
    .select("*")
    .gte("date", monthStart)
    .lt("date", monthEnd)
    .eq("is_hidden", showHidden)
    .order("date", { ascending: false });
  if (accountParam) transactionsQuery = transactionsQuery.eq("account_id", accountParam);

  const [
    { data: transactions, error: txError },
    { data: accounts, error: accError },
    { data: categories, error: catError },
    { data: classes, error: classError },
  ] = await Promise.all([
    transactionsQuery,
    supabase.from("accounts").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
    supabase.from("classes").select("*").order("name"),
  ]);

  if (txError) throw new Error(txError.message);
  if (accError) throw new Error(accError.message);
  if (catError) throw new Error(catError.message);
  if (classError) throw new Error(classError.message);

  const allAccounts = (accounts ?? []) as Account[];
  const allCategories = (categories ?? []) as Category[];
  const allClasses = (classes ?? []) as Class[];
  const monthTransactions = (transactions ?? []) as Transaction[];

  const accountsById = new Map(allAccounts.map((a) => [a.id, a]));
  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));
  const classesById = new Map(allClasses.map((c) => [c.id, c]));

  const sortedTransactions = [...monthTransactions].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at);
        break;
      case "description":
        cmp = a.description.localeCompare(b.description);
        break;
      case "account":
        cmp = (accountsById.get(a.account_id)?.label ?? "").localeCompare(
          accountsById.get(b.account_id)?.label ?? "",
        );
        break;
      case "category": {
        const aName = (a.category_id ? categoriesById.get(a.category_id)?.name : undefined) ?? "";
        const bName = (b.category_id ? categoriesById.get(b.category_id)?.name : undefined) ?? "";
        cmp = aName.localeCompare(bName);
        break;
      }
      case "class": {
        const aName = (a.class_id ? classesById.get(a.class_id)?.name : undefined) ?? "";
        const bName = (b.class_id ? classesById.get(b.class_id)?.name : undefined) ?? "";
        cmp = aName.localeCompare(bName);
        break;
      }
      case "amount":
        cmp = a.amount - b.amount;
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  let income = 0;
  let expense = 0;
  for (const transaction of monthTransactions) {
    const category = transaction.category_id ? categoriesById.get(transaction.category_id) : null;
    if (category?.kind !== "transfer") {
      if (transaction.amount >= 0) income += transaction.amount;
      else expense += transaction.amount;
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        {allAccounts.length > 0 ? (
          <AddTransactionDialog accounts={allAccounts} categories={allCategories} classes={allClasses} />
        ) : (
          <Button render={<Link href="/accounts" />}>Create an account first</Button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          render={<Link href={buildHref({ month: previousMonthKey })} />}
        >
          ← {formatMonthShort(previousMonthKey)}
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <span className="font-medium">{formatMonthLabel(monthKey)}</span>
            <span className="text-sm text-muted-foreground">
              <span className="text-emerald-600">+{formatCurrency(income)}</span>
              {" / "}
              <span className="text-destructive">{formatCurrency(expense)}</span>
            </span>
          </div>
          <MonthPicker selectedMonth={monthKey} />
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={buildHref({ month: nextMonthKey })} />}
        >
          {formatMonthShort(nextMonthKey)} →
        </Button>
      </div>

      <div className="flex items-center justify-between">
        {allAccounts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Account</span>
            <AccountFilter accounts={allAccounts} month={monthKey} selectedAccountId={accountParam} />
          </div>
        )}
        <Button variant="outline" size="sm" render={<Link href={toggleHiddenHref()} />}>
          {showHidden ? "Show active" : "Show hidden"}
        </Button>
      </div>

      {monthTransactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {showHidden
            ? `No hidden transactions in ${formatMonthLabel(monthKey)}.`
            : `No transactions in ${formatMonthLabel(monthKey)}. ${
                allAccounts.length > 0 ? "Add one above." : "Create an account, then add a transaction."
              }`}
        </p>
      ) : (
        <TransactionsTable
          transactions={sortedTransactions}
          accounts={allAccounts}
          categories={allCategories}
          classes={allClasses}
          sortKey={sortKey}
          sortDir={sortDir}
          monthKey={monthKey}
          accountParam={accountParam}
          showHidden={showHidden}
        />
      )}
    </div>
  );
}
