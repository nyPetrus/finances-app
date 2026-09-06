"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pluggyClient } from "@/lib/pluggy/client";

export async function getPluggyConnectToken() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { accessToken } = await pluggyClient.createConnectToken(undefined, {
    clientUserId: user.id,
  });

  return accessToken;
}

export async function syncPluggyItem(itemId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const item = await pluggyClient.fetchItem(itemId);
  // Fetch both BANK and CREDIT accounts for this item.
  const { results: pluggyAccounts } = await pluggyClient.fetchAccounts(itemId);

  for (const pluggyAccount of pluggyAccounts) {
    const isCreditCard = pluggyAccount.type === "CREDIT";
    const { data: account, error: upsertError } = await supabase
      .from("accounts")
      .upsert(
        {
          user_id: user.id,
          name: pluggyAccount.name,
          institution: item.connector.name,
          type: isCreditCard ? "credit_card" : "checking",
          is_automatic: true,
          pluggy_item_id: itemId,
          pluggy_account_id: pluggyAccount.id,
          // Credit card balance from Pluggy is the amount owed; store it
          // negative so it behaves like debt rather than an asset when
          // summed with bank balances.
          current_balance: isCreditCard ? -Math.abs(pluggyAccount.balance) : pluggyAccount.balance,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "pluggy_account_id" },
      )
      .select()
      .single();

    if (upsertError) throw new Error(upsertError.message);

    const transactions = await pluggyClient.fetchAllTransactions(pluggyAccount.id);

    if (transactions.length === 0) continue;

    // Pending transactions are unsettled holds/forecasts (including
    // not-yet-billed future credit-card installments) that can still
    // change, get reversed, or never actually clear. Near-term ones
    // (through tomorrow) are kept since they're likely to post as-is;
    // anything further out is speculative and waits until it's posted.
    const pendingCutoff = new Date();
    pendingCutoff.setUTCDate(pendingCutoff.getUTCDate() + 1);
    const pendingCutoffDate = pendingCutoff.toISOString().slice(0, 10);

    const postedTransactions = transactions.filter((transaction) => {
      if (transaction.status !== "PENDING") return true;
      return transaction.date.toISOString().slice(0, 10) <= pendingCutoffDate;
    });

    if (postedTransactions.length > 0) {
      const rows = postedTransactions.map((transaction) => ({
        user_id: user.id,
        account_id: account.id,
        date: transaction.date.toISOString(),
        description: transaction.description,
        amount: transaction.type === "DEBIT" ? -Math.abs(transaction.amount) : Math.abs(transaction.amount),
        source: "pluggy" as const,
        pluggy_transaction_id: transaction.id,
      }));

      const { error: txError } = await supabase
        .from("transactions")
        .upsert(rows, { onConflict: "pluggy_transaction_id" });

      if (txError) throw new Error(txError.message);
    }

    // Pluggy stops returning transactions that get canceled/reversed at the
    // source instead of flagging them, so anything previously synced for
    // this account that's no longer posted in the current fetch has to be
    // removed (this also purges any pending transactions synced before
    // this filter existed).
    const currentIds = new Set(postedTransactions.map((transaction) => transaction.id));

    // PostgREST caps a single select at its default max-rows, so accounts
    // with a long history (this one has 1500+ transactions) need paging to
    // see every previously synced id, not just the first page.
    const existingIds: string[] = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data: page, error: existingError } = await supabase
        .from("transactions")
        .select("pluggy_transaction_id")
        .eq("account_id", account.id)
        .eq("source", "pluggy")
        .range(offset, offset + pageSize - 1);

      if (existingError) throw new Error(existingError.message);
      if (!page || page.length === 0) break;

      for (const row of page) {
        if (row.pluggy_transaction_id) existingIds.push(row.pluggy_transaction_id);
      }

      if (page.length < pageSize) break;
    }

    const staleIds = existingIds.filter((id) => !currentIds.has(id));

    const deleteChunkSize = 200;
    for (let i = 0; i < staleIds.length; i += deleteChunkSize) {
      const chunk = staleIds.slice(i, i + deleteChunkSize);
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .in("pluggy_transaction_id", chunk);

      if (deleteError) throw new Error(deleteError.message);
    }
  }

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/budget");
}
