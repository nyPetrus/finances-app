import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedStatementRow } from "./parse-contabilizei-csv";

// Statements have no stable transaction id, so identity is date + amount +
// description, plus a per-file occurrence counter so genuinely identical
// same-day rows (e.g. two R$ 195,00 card purchases) each get their own hash.
function hashStatementRow(row: ParsedStatementRow, occurrence: number) {
  return createHash("sha256")
    .update(`${row.date}|${row.amount.toFixed(2)}|${row.description}|${occurrence}`)
    .digest("hex");
}

// Hashes already stored for this account. Paged with .range() since an
// account's history can pass PostgREST's 1000-row cap (see PITFALLS.md).
export async function loadKnownImportHashes(supabase: SupabaseClient, accountId: string): Promise<Set<string>> {
  const knownHashes = new Set<string>();
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { data: page, error } = await supabase
      .from("transactions")
      .select("import_hash")
      .eq("account_id", accountId)
      .not("import_hash", "is", null)
      .order("id")
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);
    if (!page || page.length === 0) break;

    for (const row of page) knownHashes.add(row.import_hash as string);

    if (page.length < pageSize) break;
  }

  return knownHashes;
}

// Inserts the rows of one parsed statement whose hash isn't in `knownHashes`
// yet, and adds the new ones to it. Overlapping statements repeat rows, so a
// hash already known (from the DB or an earlier file in the same run) is
// skipped rather than re-inserted.
export async function insertNewStatementRows(
  supabase: SupabaseClient,
  {
    userId,
    accountId,
    rows,
    knownHashes,
  }: { userId: string; accountId: string; rows: ParsedStatementRow[]; knownHashes: Set<string> },
): Promise<{ inserted: number; skipped: number }> {
  const occurrences = new Map<string, number>();
  const newRows = [];

  for (const row of rows) {
    const key = `${row.date}|${row.amount.toFixed(2)}|${row.description}`;
    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);

    const importHash = hashStatementRow(row, occurrence);
    if (knownHashes.has(importHash)) continue;
    knownHashes.add(importHash);

    newRows.push({
      user_id: userId,
      account_id: accountId,
      // Same naive-midnight format the manual add form produces.
      date: `${row.date}T00:00:00`,
      description: row.description,
      amount: row.amount,
      balance: row.balance,
      source: "csv" as const,
      import_hash: importHash,
    });
  }

  const insertChunkSize = 500;
  for (let i = 0; i < newRows.length; i += insertChunkSize) {
    const { error } = await supabase.from("transactions").insert(newRows.slice(i, i + insertChunkSize));
    if (error) throw new Error(error.message);
  }

  return { inserted: newRows.length, skipped: rows.length - newRows.length };
}
