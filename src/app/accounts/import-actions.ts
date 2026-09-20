"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseContabilizeiCsv } from "@/lib/import/parse-contabilizei-csv";
import { insertNewStatementRows, loadKnownImportHashes } from "@/lib/import/statement-import";

export type ImportFileResult = {
  name: string;
  rows: number;
  inserted: number;
  error?: string;
};

export type ImportResult = {
  files: ImportFileResult[];
  inserted: number;
  skipped: number;
};

async function runImport(formData: FormData): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const accountId = formData.get("account_id");
  const uploads = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (typeof accountId !== "string" || !accountId) throw new Error("No account selected.");
  if (uploads.length === 0) throw new Error("Choose at least one CSV file.");

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, type")
    .eq("id", accountId)
    .maybeSingle();
  if (accountError) throw new Error(accountError.message);
  if (!account) throw new Error("Account not found.");
  if (account.type !== "manual") throw new Error("Importing files is only for manual accounts.");

  const knownHashes = await loadKnownImportHashes(supabase, account.id);

  // Sorted by name so overlapping statements dedupe in a predictable order.
  const sortedUploads = [...uploads].sort((a, b) => a.name.localeCompare(b.name));

  const files: ImportFileResult[] = [];
  let skipped = 0;

  for (const upload of sortedUploads) {
    try {
      const parsed = parseContabilizeiCsv(await upload.text());
      const { inserted, skipped: fileSkipped } = await insertNewStatementRows(supabase, {
        userId: user.id,
        accountId: account.id,
        rows: parsed,
        knownHashes,
      });

      skipped += fileSkipped;
      files.push({ name: upload.name, rows: parsed.length, inserted });
    } catch (err) {
      files.push({
        name: upload.name,
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
// so failures are returned as a value for the dialog to display.
export async function importTransactionsFromFiles(formData: FormData): Promise<ImportResult | { error: string }> {
  try {
    return await runImport(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to import the file." };
  }
}
