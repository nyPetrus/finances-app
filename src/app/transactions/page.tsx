import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountFilter } from "./account-filter";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { MonthPicker } from "./month-picker";
import { TransactionRowActions } from "./transaction-row-actions";

const SORT_KEYS = ["date", "description", "account", "category", "amount"] as const;
type SortKey = (typeof SORT_KEYS)[number];

function isSortKey(value: string | undefined): value is SortKey {
  return !!value && (SORT_KEYS as readonly string[]).includes(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T00:00:00`));
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

  function sortHref(column: SortKey) {
    const nextDir: "asc" | "desc" = sortKey === column && sortDir === "asc" ? "desc" : "asc";
    return buildHref({ sort: column, dir: nextDir });
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
        cmp = (accountsById.get(a.account_id)?.name ?? "").localeCompare(
          accountsById.get(b.account_id)?.name ?? "",
        );
        break;
      case "category": {
        const aName = (a.category_id ? categoriesById.get(a.category_id)?.name : undefined) ?? "";
        const bName = (b.category_id ? categoriesById.get(b.category_id)?.name : undefined) ?? "";
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
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[28%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[16%]" />
            <col className="w-[18%]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Link href={sortHref("date")} className="flex items-center gap-1 hover:text-foreground">
                  Date
                  {sortKey === "date" &&
                    (sortDir === "asc" ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />)}
                </Link>
              </TableHead>
              <TableHead>
                <Link href={sortHref("description")} className="flex items-center gap-1 hover:text-foreground">
                  Description
                  {sortKey === "description" &&
                    (sortDir === "asc" ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />)}
                </Link>
              </TableHead>
              <TableHead>
                <Link href={sortHref("account")} className="flex items-center gap-1 hover:text-foreground">
                  Account
                  {sortKey === "account" &&
                    (sortDir === "asc" ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />)}
                </Link>
              </TableHead>
              <TableHead>
                <Link href={sortHref("category")} className="flex items-center gap-1 hover:text-foreground">
                  Category
                  {sortKey === "category" &&
                    (sortDir === "asc" ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />)}
                </Link>
              </TableHead>
              <TableHead className="text-right">
                <Link href={sortHref("amount")} className="flex items-center justify-end gap-1 hover:text-foreground">
                  Amount
                  {sortKey === "amount" &&
                    (sortDir === "asc" ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />)}
                </Link>
              </TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTransactions.map((transaction) => {
              const category = transaction.category_id ? categoriesById.get(transaction.category_id) : null;
              const transactionClass = transaction.class_id ? classesById.get(transaction.class_id) : null;
              const account = accountsById.get(transaction.account_id);
              return (
                <TableRow key={transaction.id}>
                  <TableCell>{formatDate(transaction.date)}</TableCell>
                  <TableCell className="truncate font-medium" title={transaction.description}>
                    {transaction.description}
                  </TableCell>
                  <TableCell className="truncate" title={account?.name}>
                    {account?.name ?? "—"}
                  </TableCell>
                  <TableCell className="overflow-hidden">
                    {category ? (
                      <div className="flex max-w-full flex-col gap-0.5">
                        <Badge
                          variant="secondary"
                          className="max-w-full truncate"
                          style={{ backgroundColor: `${category.color}22`, color: category.color }}
                        >
                          {category.name}
                        </Badge>
                        {transactionClass && (
                          <span className="whitespace-normal break-words text-xs text-muted-foreground">
                            › {transactionClass.name}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Uncategorized</span>
                    )}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      category?.kind === "transfer"
                        ? "text-muted-foreground"
                        : transaction.amount < 0
                          ? "text-destructive"
                          : "text-emerald-600"
                    }`}
                  >
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell>
                    <TransactionRowActions
                      transaction={transaction}
                      accounts={allAccounts}
                      categories={allCategories}
                      classes={allClasses}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
