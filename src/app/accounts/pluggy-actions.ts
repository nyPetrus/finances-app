"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pluggyClient } from "@/lib/pluggy/client";
import type { Item, Transaction } from "pluggy-sdk";

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Pluggy only refreshes an item's data from the bank on its own schedule
// (see Item.nextAutoSyncAt) — reading fetchItem/fetchAccounts/fetchAllTransactions
// alone just returns whatever it last cached, which can be hours or days
// stale. updateItem() is what actually asks Pluggy to go talk to the bank
// right now; it responds immediately with status "UPDATING", so the caller
// has to poll fetchItem until that settles into a terminal status.
//
// Bounded to leave headroom under the Server Action's maxDuration (see
// src/app/accounts/page.tsx) for the fetch/upsert work that follows.
async function waitForPluggyUpdate(itemId: string, budgetMs: number): Promise<Item> {
  const deadline = Date.now() + budgetMs;
  let item: Item;
  try {
    item = await pluggyClient.updateItem(itemId);
  } catch (err) {
    // Some connectors (notably Pluggy's own sandbox/demo connectors, which
    // have no real bank behind them to poll) reject on-demand update
    // requests outright with a 400. Fall back to whatever Pluggy currently
    // has cached rather than failing the whole sync over it.
    console.error("Pluggy updateItem failed, falling back to cached data:", err);
    return pluggyClient.fetchItem(itemId);
  }

  while ((item.status === "UPDATING" || item.status === "MERGING") && Date.now() < deadline) {
    await sleep(2500);
    item = await pluggyClient.fetchItem(itemId);
  }

  return item;
}

// For foreign-currency purchases (e.g. USD subscriptions on a credit card),
// Pluggy's `amount` is in the original currency (currencyCode) and the BRL
// value the account is actually charged is in amountInAccountCurrency.
// Everything in this app is BRL, so always prefer the account-currency value.
function accountAmount(t: Transaction): number {
  return t.amountInAccountCurrency ?? t.amount;
}

// Credit card feeds (seen on Nubank and XP, on bill payments) report some
// transactions twice under different Pluggy ids: once as the live
// transaction (full creditCardMetadata, real timestamp) and again, after the
// bill closes, as a bill line item whose metadata carries only a billId and
// whose date is midnight BRT. The two copies' descriptions can differ (XP:
// "Pagamento de fatura" / "Pagamentos Validos Normais" live vs "Pagamento
// recebido" on the bill), so the twin is matched on BRT day, amount, and
// type only. Drop the bill-line copy when its live twin is present; if the
// twin is ever missing, the bill-line copy is kept so nothing is lost.
// Anything already synced that this drops gets purged by the stale-id
// cleanup below.
function dropBillLineDuplicates(transactions: Transaction[]): Transaction[] {
  const brtDay = (date: Date) => new Date(date.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
  const key = (t: Transaction) => `${brtDay(t.date)}|${accountAmount(t)}|${t.type}`;
  const isBillLineOnly = (t: Transaction) =>
    !!t.creditCardMetadata?.billId && !t.creditCardMetadata.cardNumber;

  const liveKeys = new Set(transactions.filter((t) => !isBillLineOnly(t)).map(key));
  return transactions.filter((t) => !(isBillLineOnly(t) && liveKeys.has(key(t))));
}

// The account's end-of-day balance, set on every transaction of that day.
// Pluggy leaves its own per-transaction `balance` empty for these banks
// (Nubank, XP), so it's derived: start from the account's current balance
// and walk back day by day, undoing each day's transactions. Per day, not
// per transaction: `transactions.date` stores only the day, so the order
// within a day is unknown, and a day with a big transfer in and out would
// get made-up balances in between (seen on Nubank, -49k one day). Only for
// bank accounts (a card's "balance" is the bill, not a running total) whose
// current balance isn't 0 — XP reports 0 for every account, which would
// make every derived balance wrong. A transaction missing from Pluggy's
// history skews every earlier day.
function endOfDayBalances(
  transactions: Transaction[],
  currentBalance: number,
  signedAmount: (transaction: Transaction) => number,
  isBankAccount: boolean,
): Map<string, number> {
  const balances = new Map<string, number>();
  if (!isBankAccount || currentBalance === 0) return balances;

  // Same day key the row is stored under (the ISO string's date part).
  const dayOf = (transaction: Transaction) => transaction.date.toISOString().slice(0, 10);
  const byDay = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const day = dayOf(transaction);
    byDay.set(day, [...(byDay.get(day) ?? []), transaction]);
  }

  let balance = currentBalance;
  for (const day of [...byDay.keys()].sort().reverse()) {
    const dayTransactions = byDay.get(day)!;
    for (const transaction of dayTransactions) balances.set(transaction.id, Math.round(balance * 100) / 100);
    balance -= dayTransactions.reduce((sum, transaction) => sum + signedAmount(transaction), 0);
  }
  return balances;
}

export async function syncPluggyItem(itemId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const item = await waitForPluggyUpdate(itemId, 40_000);

  if (item.status === "UPDATING" || item.status === "MERGING") {
    throw new Error("Your bank is still updating — press Sync again in a moment.");
  }
  if (item.status === "LOGIN_ERROR") {
    throw new Error('This bank connection needs to be reconnected — use "Connect bank" to sign in again.');
  }
  if (item.status === "WAITING_USER_INPUT" || item.status === "WAITING_USER_ACTION") {
    throw new Error('This bank needs additional confirmation (e.g. a code or app approval) — use "Connect bank" to complete it.');
  }
  if (item.status === "OUTDATED") {
    throw new Error("Your bank couldn't be updated just now — press Sync to try again.");
  }

  // Fetch both BANK and CREDIT accounts for this item.
  const { results: pluggyAccounts } = await pluggyClient.fetchAccounts(itemId);

  // The bank's account name is only a starting value: once the account
  // exists, Name belongs to the user (editable on the Accounts page), so a
  // re-sync must not overwrite it — per explicit user request.
  const { data: existingAccounts, error: existingError } = await supabase
    .from("accounts")
    .select("pluggy_account_id")
    .in(
      "pluggy_account_id",
      pluggyAccounts.map((a) => a.id),
    );
  if (existingError) throw new Error(existingError.message);
  const existingPluggyIds = new Set((existingAccounts ?? []).map((a) => a.pluggy_account_id));

  for (const pluggyAccount of pluggyAccounts) {
    const isCreditCard = pluggyAccount.type === "CREDIT";
    const fields = {
      source: item.connector.name,
      type: isCreditCard ? "credit_card" : "checking",
      is_automatic: true,
      pluggy_item_id: itemId,
      // Credit card balance from Pluggy is the amount owed; store it
      // negative so it behaves like debt rather than an asset when
      // summed with bank balances.
      current_balance: isCreditCard ? -Math.abs(pluggyAccount.balance) : pluggyAccount.balance,
      updated_at: new Date().toISOString(),
    };
    // Separate update/insert rather than one upsert: `name` is NOT NULL, and
    // an upsert payload without it would fail the insert half's check even
    // when the row already exists.
    const { data: account, error: upsertError } = existingPluggyIds.has(pluggyAccount.id)
      ? await supabase
          .from("accounts")
          .update(fields)
          .eq("pluggy_account_id", pluggyAccount.id)
          .eq("user_id", user.id)
          .select()
          .single()
      : await supabase
          .from("accounts")
          .insert({ ...fields, user_id: user.id, name: pluggyAccount.name, pluggy_account_id: pluggyAccount.id })
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

    const postedTransactions = dropBillLineDuplicates(
      transactions.filter((transaction) => {
        if (transaction.status !== "PENDING") return true;
        return transaction.date.toISOString().slice(0, 10) <= pendingCutoffDate;
      }),
    );

    const signedAmount = (transaction: Transaction) =>
      transaction.type === "DEBIT" ? -Math.abs(accountAmount(transaction)) : Math.abs(accountAmount(transaction));
    const balances = endOfDayBalances(postedTransactions, pluggyAccount.balance, signedAmount, !isCreditCard);

    if (postedTransactions.length > 0) {
      const rows = postedTransactions.map((transaction) => ({
        user_id: user.id,
        account_id: account.id,
        date: transaction.date.toISOString(),
        description: transaction.description.toLowerCase(),
        amount: signedAmount(transaction),
        balance: balances.get(transaction.id) ?? null,
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
  revalidatePath("/search");
  revalidatePath("/budget");
}
