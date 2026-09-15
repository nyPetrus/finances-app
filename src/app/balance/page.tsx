import { createClient } from "@/lib/supabase/server";
import { fetchAllTransactionsInRange } from "@/lib/supabase/fetch-all-transactions";
import type { Account } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Read-only reconciliation table, no Add/Delete/Columns toolbar — a row
// here is a derived comparison (bank-reported balance vs. the sum of every
// transaction on record for that account), not an editable entity; account
// management already lives on /accounts.
function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export default async function BalancePage() {
  const supabase = await createClient();

  const [{ data: allAccounts, error: accError }, transactions] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    fetchAllTransactionsInRange(supabase, "0001-01-01", "9999-12-31"),
  ]);

  if (accError) throw new Error(accError.message);

  const accounts = (allAccounts ?? []) as Account[];

  const transactionsTotalByAccount = new Map<string, number>();
  for (const transaction of transactions) {
    transactionsTotalByAccount.set(
      transaction.account_id,
      (transactionsTotalByAccount.get(transaction.account_id) ?? 0) + transaction.amount,
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Balance</h1>

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accounts yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead className="text-right whitespace-nowrap">Bank</TableHead>
              <TableHead className="text-right whitespace-nowrap">Transactions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => {
              const transactionsTotal = transactionsTotalByAccount.get(account.id) ?? 0;
              return (
                <TableRow key={account.id}>
                  <TableCell className="max-w-40 truncate">
                    {account.label ? (
                      <Badge variant="secondary" className="max-w-full gap-1 truncate">
                        {account.label}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(account.current_balance)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(transactionsTotal)}
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
