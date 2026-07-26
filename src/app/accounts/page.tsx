import { createClient } from "@/lib/supabase/server";
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
import { AddAccountDialog } from "./add-account-dialog";
import { AccountRowActions } from "./account-row-actions";
import { ConnectBankButton } from "./connect-bank-button";

const typeLabels: Record<Account["type"], string> = {
  checking: "Checking",
  investment: "Investment",
  fgts: "FGTS",
  manual: "Manual",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at");

  if (error) throw new Error(error.message);

  const all = (accounts ?? []) as Account[];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <div className="flex items-center gap-2">
          <ConnectBankButton />
          <AddAccountDialog />
        </div>
      </div>

      {all.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No accounts yet. Add your first one to start tracking transactions.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Institution</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {all.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell>{account.institution ?? "—"}</TableCell>
                <TableCell>{typeLabels[account.type]}</TableCell>
                <TableCell>
                  <Badge variant={account.is_automatic ? "default" : "secondary"}>
                    {account.is_automatic ? "Automatic" : "Manual"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(account.current_balance)}
                </TableCell>
                <TableCell>
                  <AccountRowActions account={account} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
