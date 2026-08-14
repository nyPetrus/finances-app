import { Fragment } from "react";
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

type MonthGroup = {
  key: string;
  label: string;
  income: number;
  expense: number;
  transactions: Transaction[];
};

function groupByMonth(transactions: Transaction[], categoriesById: Map<string, Category>) {
  const groups: MonthGroup[] = [];
  const groupsByKey = new Map<string, MonthGroup>();

  for (const transaction of transactions) {
    const key = transaction.date.slice(0, 7);
    let group = groupsByKey.get(key);
    if (!group) {
      group = { key, label: formatMonthLabel(key), income: 0, expense: 0, transactions: [] };
      groupsByKey.set(key, group);
      groups.push(group);
    }
    group.transactions.push(transaction);

    const category = transaction.category_id ? categoriesById.get(transaction.category_id) : null;
    if (category?.kind !== "transfer") {
      if (transaction.amount >= 0) group.income += transaction.amount;
      else group.expense += transaction.amount;
    }
  }

  return groups;
}

export default async function TransactionsPage() {
  const supabase = await createClient();

  const [{ data: transactions, error: txError }, { data: accounts, error: accError }, { data: categories, error: catError }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .limit(200),
      supabase.from("accounts").select("*").order("name"),
      supabase.from("categories").select("*").order("name"),
    ]);

  if (txError) throw new Error(txError.message);
  if (accError) throw new Error(accError.message);
  if (catError) throw new Error(catError.message);

  const allAccounts = (accounts ?? []) as Account[];
  const allCategories = (categories ?? []) as Category[];
  const allTransactions = (transactions ?? []) as Transaction[];

  const accountsById = new Map(allAccounts.map((a) => [a.id, a]));
  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));
  const monthGroups = groupByMonth(allTransactions, categoriesById);

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

      {allTransactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No transactions yet.{" "}
          {allAccounts.length > 0 ? "Add your first one above." : "Create an account, then add a transaction."}
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
            {monthGroups.map((group) => (
              <Fragment key={group.key}>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={6} className="py-2">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{group.label}</span>
                      <span>
                        <span className="text-emerald-600">+{formatCurrency(group.income)}</span>
                        {" / "}
                        <span className="text-destructive">{formatCurrency(group.expense)}</span>
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
                {group.transactions.map((transaction) => {
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
              </Fragment>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
