import { createClient } from "@/lib/supabase/server";
import { fetchAllTransactionsInRange } from "@/lib/supabase/fetch-all-transactions";
import type { Account } from "@/lib/supabase/types";
import { AccountsTable } from "./accounts-table";
import { GoogleDrivePanel } from "./google-drive-panel";
import { isSortKey, type SortKey } from "./sort";

// syncPluggyItem now waits on a live bank update (via Pluggy's updateItem),
// which can take longer than the platform's default Server Action timeout.
export const maxDuration = 60;

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { sort: sortParam, dir: dirParam } = await searchParams;
  const sortKey: SortKey = isSortKey(sortParam) ? sortParam : "name";
  const sortDir: "asc" | "desc" = dirParam === "desc" ? "desc" : "asc";

  const supabase = await createClient();
  const [{ data: accounts, error }, transactions, googleDriveConnection] = await Promise.all([
    supabase.from("accounts").select("*"),
    fetchAllTransactionsInRange(supabase, "0001-01-01", "9999-12-31"),
    supabase.from("google_drive_tokens").select("google_email").maybeSingle(),
  ]);

  if (error) throw new Error(error.message);

  const allAccounts = (accounts ?? []) as Account[];

  const transactionsTotalByAccount: Record<string, number> = {};
  for (const transaction of transactions) {
    transactionsTotalByAccount[transaction.account_id] =
      (transactionsTotalByAccount[transaction.account_id] ?? 0) + transaction.amount;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Accounts</h1>

      <GoogleDrivePanel
        connected={!!googleDriveConnection.data}
        email={googleDriveConnection.data?.google_email ?? null}
      />

      <AccountsTable
        accounts={allAccounts}
        transactionsTotalByAccount={transactionsTotalByAccount}
        sortKey={sortKey}
        sortDir={sortDir}
      />
    </div>
  );
}
