import { createClient } from "@/lib/supabase/server";
import type { Account } from "@/lib/supabase/types";
import { AccountsTable } from "./accounts-table";
import { ConnectBankButton } from "./connect-bank-button";
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
  const { data: accounts, error } = await supabase.from("accounts").select("*");

  if (error) throw new Error(error.message);

  const allAccounts = (accounts ?? []) as Account[];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <ConnectBankButton />
      </div>

      <AccountsTable accounts={allAccounts} sortKey={sortKey} sortDir={sortDir} />
    </div>
  );
}
