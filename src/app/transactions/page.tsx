import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category, Transaction } from "@/lib/supabase/types";
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
import { AddTransactionDialog } from "./add-transaction-dialog";
import { MonthPicker } from "./month-picker";
import { TransactionRowActions } from "./transaction-row-actions";

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
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const monthKey = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonthKey();
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${shiftMonth(monthKey, 1)}-01`;
  const previousMonthKey = shiftMonth(monthKey, -1);
  const nextMonthKey = shiftMonth(monthKey, 1);

  const supabase = await createClient();

  const [{ data: transactions, error: txError }, { data: accounts, error: accError }, { data: categories, error: catError }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .gte("date", monthStart)
        .lt("date", monthEnd)
        .order("date", { ascending: false }),
      supabase.from("accounts").select("*").order("name"),
      supabase.from("categories").select("*").order("name"),
    ]);

  if (txError) throw new Error(txError.message);
  if (accError) throw new Error(accError.message);
  if (catError) throw new Error(catError.message);

  const allAccounts = (accounts ?? []) as Account[];
  const allCategories = (categories ?? []) as Category[];
  const monthTransactions = (transactions ?? []) as Transaction[];

  const accountsById = new Map(allAccounts.map((a) => [a.id, a]));
  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));

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
          <AddTransactionDialog accounts={allAccounts} categories={allCategories} />
        ) : (
          <Button render={<Link href="/accounts" />}>Create an account first</Button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" render={<Link href={`/transactions?month=${previousMonthKey}`} />}>
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
        <Button variant="outline" size="sm" render={<Link href={`/transactions?month=${nextMonthKey}`} />}>
          {formatMonthShort(nextMonthKey)} →
        </Button>
      </div>

      {monthTransactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No transactions in {formatMonthLabel(monthKey)}.{" "}
          {allAccounts.length > 0 ? "Add one above." : "Create an account, then add a transaction."}
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
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthTransactions.map((transaction) => {
              const category = transaction.category_id ? categoriesById.get(transaction.category_id) : null;
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
                      <Badge
                        variant="secondary"
                        className="max-w-full truncate"
                        style={{ backgroundColor: `${category.color}22`, color: category.color }}
                      >
                        {category.name}
                      </Badge>
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
