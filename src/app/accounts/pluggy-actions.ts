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
  // Only sync bank accounts (checking/savings) for now — credit cards use a
  // different sign convention and aren't part of this app's scope yet.
  const { results: pluggyAccounts } = await pluggyClient.fetchAccounts(itemId, "BANK");

  for (const pluggyAccount of pluggyAccounts) {
    const { data: account, error: upsertError } = await supabase
      .from("accounts")
      .upsert(
        {
          user_id: user.id,
          name: pluggyAccount.name,
          institution: item.connector.name,
          type: "checking",
          is_automatic: true,
          pluggy_item_id: itemId,
          pluggy_account_id: pluggyAccount.id,
          current_balance: pluggyAccount.balance,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "pluggy_account_id" },
      )
      .select()
      .single();

    if (upsertError) throw new Error(upsertError.message);

    const transactions = await pluggyClient.fetchAllTransactions(pluggyAccount.id);

    if (transactions.length === 0) continue;

    const rows = transactions.map((transaction) => ({
      user_id: user.id,
      account_id: account.id,
      date: transaction.date.toISOString().slice(0, 10),
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

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/budget");
}
