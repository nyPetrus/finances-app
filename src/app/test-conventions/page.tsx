import { createClient } from "@/lib/supabase/server";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/category-icon";
import { ColumnHeaderIcon } from "@/components/column-header-icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LandmarkIcon, TagIcon, TagsIcon } from "lucide-react";

// Read-only snapshot page — no sorting/selection/editing, so it skips
// useColumnPreferences/useRowSelection/ColumnsMenu entirely (see
// table-page-conventions); it exists only to eyeball every non-system
// column against the formatting documented in .claude/skills.
const ROW_LIMIT = 20;

const typeLabels: Record<Account["type"], string> = {
  checking: "Checking",
  investment: "Investment",
  fgts: "FGTS",
  manual: "Manual",
  credit_card: "Credit card",
};

const kindLabels: Record<Category["kind"], string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

const MONTH_ABBREVIATIONS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function formatDate(value: string) {
  const date = new Date(value);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day} ${MONTH_ABBREVIATIONS[date.getUTCMonth()]} ${year}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-sm text-muted-foreground">{children}</span>;
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

  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const accountsById = new Map(accounts.map((a) => [a.id, a]));

  const displayCategories = categories.slice(0, ROW_LIMIT);
  const displayClasses = classes.slice(0, ROW_LIMIT);
  const displayAccounts = accounts.slice(0, ROW_LIMIT);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Test Conventios</h1>
        <p className="text-sm text-muted-foreground">
          Read-only snapshot of up to {ROW_LIMIT} rows per table, every column
          except id/user_id/created_at and Pluggy&apos;s own sync
          identifiers (pluggy_item_id, pluggy_account_id,
          pluggy_transaction_id) — for sanity-checking the formatting
          conventions documented in .claude/skills against real data.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Transactions</h2>
        {transactions.length === 0 ? (
          <Muted>No transactions yet.</Muted>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Date</TableHead>
                <TableHead className="max-w-64">Description</TableHead>
                <TableHead className="text-center">
                  <ColumnHeaderIcon icon={LandmarkIcon} label="Account" iconOnly />
                </TableHead>
                <TableHead className="text-center">
                  <ColumnHeaderIcon icon={TagIcon} label="Category" iconOnly />
                </TableHead>
                <TableHead className="text-center">
                  <ColumnHeaderIcon icon={TagsIcon} label="Class" iconOnly />
                </TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-center">Hidden</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => {
                const account = accountsById.get(transaction.account_id);
                const category = transaction.category_id ? categoriesById.get(transaction.category_id) : null;
                const transactionClass = transaction.class_id
                  ? classes.find((c) => c.id === transaction.class_id)
                  : null;
                const colorClassName =
                  category?.kind === "transfer"
                    ? "text-muted-foreground"
                    : transaction.amount >= 0
                      ? "text-emerald-600"
                      : undefined;
                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(transaction.date)}</TableCell>
                    <TableCell className="max-w-64 truncate" title={transaction.description}>
                      {transaction.description}
                    </TableCell>
                    <TableCell className="max-w-40 truncate">
                      {account?.label ? (
                        <Badge variant="secondary" className="max-w-full gap-1 truncate">
                          {account.label}
                        </Badge>
                      ) : (
                        <Muted>—</Muted>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {category ? (
                        <span title={category.name} className="inline-flex">
                          <CategoryIcon icon={category.icon} className="size-4" />
                        </span>
                      ) : (
                        <Muted>Uncategorized</Muted>
                      )}
                    </TableCell>
                    <TableCell className="max-w-40 truncate">
                      {transactionClass ? (
                        <Badge variant="secondary" className="max-w-full gap-1 truncate">
                          {transactionClass.name}
                        </Badge>
                      ) : (
                        <Muted>—</Muted>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={colorClassName}>{formatCurrency(transaction.amount)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {transaction.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {transaction.is_hidden ? "Yes" : <Muted>—</Muted>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Categories</h2>
        {displayCategories.length === 0 ? (
          <Muted>No categories yet.</Muted>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <ColumnHeaderIcon icon={TagIcon} label="Name" />
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Default</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="max-w-72 font-medium">
                    <div className="flex items-center gap-2">
                      <CategoryIcon icon={category.icon} className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 truncate">{category.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{kindLabels[category.kind]}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {category.is_default ? <Badge variant="secondary">Default</Badge> : <Muted>—</Muted>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Classes</h2>
        {displayClasses.length === 0 ? (
          <Muted>No classes yet.</Muted>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <ColumnHeaderIcon icon={TagsIcon} label="Name" />
                </TableHead>
                <TableHead className="text-center">
                  <ColumnHeaderIcon icon={TagIcon} label="Category" iconOnly />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayClasses.map((classItem) => {
                const category = categoriesById.get(classItem.category_id);
                return (
                  <TableRow key={classItem.id}>
                    <TableCell className="font-medium">{classItem.name}</TableCell>
                    <TableCell className="text-center">
                      {category ? (
                        <span title={category.name} className="inline-flex">
                          <CategoryIcon icon={category.icon} className="size-4" />
                        </span>
                      ) : (
                        <Muted>—</Muted>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Accounts</h2>
        {displayAccounts.length === 0 ? (
          <Muted>No accounts yet.</Muted>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>
                  <ColumnHeaderIcon icon={LandmarkIcon} label="Name" />
                </TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Automatic</TableHead>
                <TableHead className="text-center whitespace-nowrap">Last sync</TableHead>
                <TableHead className="text-right whitespace-nowrap">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="max-w-40 truncate">
                    {account.label ? (
                      <Badge variant="secondary" className="max-w-full gap-1 truncate">
                        {account.label}
                      </Badge>
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </TableCell>
                  <TableCell className="max-w-56 truncate font-medium">{account.name}</TableCell>
                  <TableCell className="max-w-32 truncate">
                    {account.source ? (
                      <Badge variant="secondary" className="max-w-full gap-1 truncate">
                        {account.source}
                      </Badge>
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{typeLabels[account.type]}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{account.is_automatic ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {account.is_automatic ? formatDateTime(account.updated_at) : <Muted>—</Muted>}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(account.current_balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
