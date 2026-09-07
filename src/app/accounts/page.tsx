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
import { SortableTableHead } from "@/components/sortable-table-head";
import { AddAccountDialog } from "./add-account-dialog";
import { AccountRowActions } from "./account-row-actions";
import { ConnectBankButton } from "./connect-bank-button";

const typeLabels: Record<Account["type"], string> = {
  checking: "Checking",
  investment: "Investment",
  fgts: "FGTS",
  manual: "Manual",
  credit_card: "Credit card",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const SORT_KEYS = ["name", "institution", "type", "source", "balance"] as const;
type SortKey = (typeof SORT_KEYS)[number];

function isSortKey(value: string | undefined): value is SortKey {
  return !!value && (SORT_KEYS as readonly string[]).includes(value);
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { sort: sortParam, dir: dirParam } = await searchParams;
  const sortKey: SortKey = isSortKey(sortParam) ? sortParam : "name";
  const sortDir: "asc" | "desc" = dirParam === "desc" ? "desc" : "asc";

  function sortHref(column: SortKey) {
    const nextDir: "asc" | "desc" = sortKey === column && sortDir === "asc" ? "desc" : "asc";
    return `/accounts?${new URLSearchParams({ sort: column, dir: nextDir }).toString()}`;
  }

  const supabase = await createClient();
  const { data: accounts, error } = await supabase.from("accounts").select("*");

  if (error) throw new Error(error.message);

  const all = (accounts ?? []) as Account[];

  const sorted = [...all].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "institution":
        cmp = (a.institution ?? "").localeCompare(b.institution ?? "");
        break;
      case "type":
        cmp = typeLabels[a.type].localeCompare(typeLabels[b.type]);
        break;
      case "source":
        cmp = Number(a.is_automatic) - Number(b.is_automatic);
        break;
      case "balance":
        cmp = a.current_balance - b.current_balance;
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <div className="flex items-center gap-2">
          <ConnectBankButton />
          <AddAccountDialog />
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No accounts yet. Add your first one to start tracking transactions.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead href={sortHref("name")} active={sortKey === "name"} dir={sortDir}>
                Name
              </SortableTableHead>
              <SortableTableHead href={sortHref("institution")} active={sortKey === "institution"} dir={sortDir}>
                Institution
              </SortableTableHead>
              <SortableTableHead href={sortHref("type")} active={sortKey === "type"} dir={sortDir}>
                Type
              </SortableTableHead>
              <SortableTableHead href={sortHref("source")} active={sortKey === "source"} dir={sortDir}>
                Source
              </SortableTableHead>
              <SortableTableHead
                href={sortHref("balance")}
                active={sortKey === "balance"}
                dir={sortDir}
                align="right"
              >
                Balance
              </SortableTableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((account) => (
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
