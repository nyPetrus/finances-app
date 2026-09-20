"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Account } from "@/lib/supabase/types";
import { importTransactionsFromFiles, type ImportResult } from "./import-actions";

// Opened from a manual account's row menu. Reads the chosen CSV file(s)
// straight from the browser; only rows the account doesn't already have are
// added, so re-importing an overlapping statement is safe.
export function ImportTransactionsDialog({ account, onClose }: { account: Account; onClose: () => void }) {
  const [isImporting, startImport] = useTransition();
  const [hasFiles, setHasFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setResult(null);
    startImport(async () => {
      const response = await importTransactionsFromFiles(formData);
      if ("error" in response) {
        setError(response.error);
        return;
      }
      setResult(response);
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import transactions into {account.name}</DialogTitle>
        </DialogHeader>
        <form id="import-transactions-form" action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="account_id" value={account.id} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-files">CSV file(s) from your bank</Label>
            <Input
              id="import-files"
              name="files"
              type="file"
              accept=".csv,text/csv"
              multiple
              onChange={(e) => setHasFiles((e.target.files?.length ?? 0) > 0)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {result && (
            <div className="flex flex-col gap-1 text-sm">
              <p>
                {result.inserted} new transaction{result.inserted === 1 ? "" : "s"} imported, {result.skipped} already
                present.
              </p>
              <ul className="flex flex-col gap-1">
                {result.files.map((file) => (
                  <li key={file.name} className="flex items-center justify-between gap-4">
                    <span className="truncate">{file.name}</span>
                    {file.error ? (
                      <span className="shrink-0 text-destructive">{file.error}</span>
                    ) : (
                      <span className="shrink-0 text-muted-foreground">
                        {file.inserted} of {file.rows} new
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {result ? "Close" : "Cancel"}
          </Button>
          <Button type="submit" form="import-transactions-form" disabled={isImporting || !hasFiles}>
            {isImporting ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
