"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  downloadDriveFileText,
  extractDriveFolderId,
  listDriveFilesInFolder,
  refreshGoogleAccessToken,
  revokeGoogleToken,
  type DriveFile,
} from "@/lib/google-drive/client";
import { parseContabilizeiCsv, type ParsedStatementRow } from "@/lib/google-drive/parse-contabilizei-csv";

// 60s safety margin so a token that's about to expire mid-request still
// gets refreshed rather than failing the Drive call that follows.
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

async function getValidAccessToken(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("google_drive_tokens")
    .select("refresh_token, access_token, access_token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Google Drive isn't connected.");

  const expiresAt = data.access_token_expires_at ? new Date(data.access_token_expires_at).getTime() : 0;
  if (data.access_token && expiresAt - Date.now() > EXPIRY_SAFETY_MARGIN_MS) {
    return data.access_token as string;
  }

  const refreshed = await refreshGoogleAccessToken(data.refresh_token as string);

  const { error: updateError } = await supabase
    .from("google_drive_tokens")
    .update({
      access_token: refreshed.access_token,
      access_token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) throw new Error(updateError.message);

  return refreshed.access_token;
}

export async function listGoogleDriveFolderFiles(folderInput: string): Promise<DriveFile[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const folderId = extractDriveFolderId(folderInput);
  if (!folderId) throw new Error("Enter a Drive folder link or ID.");

  const accessToken = await getValidAccessToken(supabase, user.id);

  try {
    return await listDriveFilesInFolder(accessToken, folderId);
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? `Failed to list that folder — check the link/ID and that this Google account can access it.`
        : "Failed to list that folder.",
    );
  }
}

export type DriveImportFileResult = {
  name: string;
  rows: number;
  inserted: number;
  error?: string;
};

export type DriveImportResult = {
  files: DriveImportFileResult[];
  inserted: number;
  skipped: number;
};

// Statements have no stable transaction id, so identity is date + amount +
// description, plus a per-file occurrence counter so genuinely identical
// same-day rows (e.g. two R$ 195,00 card purchases) each get their own hash.
function hashStatementRow(row: ParsedStatementRow, occurrence: number) {
  return createHash("sha256")
    .update(`${row.date}|${row.amount.toFixed(2)}|${row.description}|${occurrence}`)
    .digest("hex");
}

// Reads every CSV in the account's Drive folder and inserts the rows not
// already imported. `folderInput` (link or id) links/re-links the folder to
// the account; leave it empty to reuse the one already stored.
async function runDriveImport(accountId: string, folderInput: string): Promise<DriveImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, type, google_drive_folder_id")
    .eq("id", accountId)
    .maybeSingle();
  if (accountError) throw new Error(accountError.message);
  if (!account) throw new Error("Account not found.");
  if (account.type !== "manual") throw new Error("Drive import is only for manual accounts.");

  const folderId = extractDriveFolderId(folderInput) || (account.google_drive_folder_id as string | null);
  if (!folderId) throw new Error("Enter a Drive folder link or ID.");

  const accessToken = await getValidAccessToken(supabase, user.id);

  let driveFiles: DriveFile[];
  try {
    driveFiles = await listDriveFilesInFolder(accessToken, folderId);
  } catch {
    throw new Error("Failed to list that folder — check the link/ID and that this Google account can access it.");
  }

  if (folderId !== account.google_drive_folder_id) {
    const { error: linkError } = await supabase
      .from("accounts")
      .update({ google_drive_folder_id: folderId })
      .eq("id", account.id);
    if (linkError) throw new Error(linkError.message);
  }

  const csvFiles = driveFiles
    .filter((file) => file.name.toLowerCase().endsWith(".csv"))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Hashes already stored for this account. Paged with .range() since an
  // account's history can pass PostgREST's 1000-row cap (see PITFALLS.md).
  const knownHashes = new Set<string>();
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data: page, error: hashError } = await supabase
      .from("transactions")
      .select("import_hash")
      .eq("account_id", account.id)
      .not("import_hash", "is", null)
      .order("id")
      .range(offset, offset + pageSize - 1);

    if (hashError) throw new Error(hashError.message);
    if (!page || page.length === 0) break;

    for (const row of page) knownHashes.add(row.import_hash as string);

    if (page.length < pageSize) break;
  }

  const files: DriveImportFileResult[] = [];
  let skipped = 0;

  for (const file of csvFiles) {
    try {
      const parsed = parseContabilizeiCsv(await downloadDriveFileText(accessToken, file.id));

      // Overlapping statements repeat rows, so a hash already known (from
      // the DB or an earlier file in this run) is skipped, not re-inserted.
      const occurrences = new Map<string, number>();
      const newRows = [];
      for (const row of parsed) {
        const key = `${row.date}|${row.amount.toFixed(2)}|${row.description}`;
        const occurrence = occurrences.get(key) ?? 0;
        occurrences.set(key, occurrence + 1);

        const importHash = hashStatementRow(row, occurrence);
        if (knownHashes.has(importHash)) continue;
        knownHashes.add(importHash);

        newRows.push({
          user_id: user.id,
          account_id: account.id,
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
        const { error: insertError } = await supabase
          .from("transactions")
          .insert(newRows.slice(i, i + insertChunkSize));
        if (insertError) throw new Error(insertError.message);
      }

      skipped += parsed.length - newRows.length;
      files.push({ name: file.name, rows: parsed.length, inserted: newRows.length });
    } catch (err) {
      files.push({
        name: file.name,
        rows: 0,
        inserted: 0,
        error: err instanceof Error ? err.message : "Failed to import this file.",
      });
    }
  }

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/search");
  revalidatePath("/budget");
  revalidatePath("/");

  return { files, inserted: files.reduce((sum, file) => sum + file.inserted, 0), skipped };
}

// Thrown errors from a server action lose their message in production
// builds (the client only sees a generic "Server Components render" text),
// so failures are returned as a value for the panel to display.
export async function importAccountFolderFromDrive(
  accountId: string,
  folderInput: string,
): Promise<DriveImportResult | { error: string }> {
  try {
    return await runDriveImport(accountId, folderInput);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to import from Drive." };
  }
}

export async function disconnectGoogleDrive() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("google_drive_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (data) {
    // Best-effort — a hiccup on Google's end shouldn't block disconnecting.
    await revokeGoogleToken(data.refresh_token as string).catch(() => {});
  }

  const { error } = await supabase.from("google_drive_tokens").delete().eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/accounts");
}
