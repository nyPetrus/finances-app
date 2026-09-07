import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transaction } from "./types";

/**
 * PostgREST caps a single select at its default max-rows (1000), silently
 * truncating anything beyond that with no error. A year of transactions can
 * easily exceed that, so callers needing a full year (or similar range)
 * must page through results rather than doing a single `.select("*")`.
 */
export async function fetchAllTransactionsInRange(
  supabase: SupabaseClient,
  gte: string,
  lt: string,
): Promise<Transaction[]> {
  const pageSize = 1000;
  const rows: Transaction[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .gte("date", gte)
      .lt("date", lt)
      .eq("is_hidden", false)
      .order("date", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    rows.push(...(data as Transaction[]));

    if (data.length < pageSize) break;
  }

  return rows;
}
