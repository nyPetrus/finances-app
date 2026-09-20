"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CloudCheckIcon, CloudIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DriveFile } from "@/lib/google-drive/client";
import {
  disconnectGoogleDrive,
  importAccountFolderFromDrive,
  listGoogleDriveFolderFiles,
  type DriveImportResult,
} from "./google-drive-actions";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

// A minimal, on-demand validation of the Google OAuth + Drive-read flow —
// connect once, then list one folder's files by pasting its link/ID. This
// is deliberately not wired to per-account folders yet; see
// search-page-conventions-adjacent plan in conversation history for the
// eventual "Update accounts folders" button this is a first step toward.
export function GoogleDrivePanel({
  connected,
  email,
  manualAccounts,
}: {
  connected: boolean;
  email: string | null;
  manualAccounts: { id: string; name: string; google_drive_folder_id: string | null }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [importAccountId, setImportAccountId] = useState(manualAccounts[0]?.id ?? "");
  // Empty means "reuse the folder already linked to the selected account".
  const [importFolderInput, setImportFolderInput] = useState("");
  const [importResult, setImportResult] = useState<DriveImportResult | null>(null);
  const importAccount = manualAccounts.find((account) => account.id === importAccountId);
  const [folderInput, setFolderInput] = useState("");
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleListFiles() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await listGoogleDriveFolderFiles(folderInput);
        setFiles(result);
      } catch (err) {
        setFiles(null);
        setError(err instanceof Error ? err.message : "Failed to list that folder.");
      }
    });
  }

  function handleImport() {
    setError(null);
    setImportResult(null);
    startTransition(async () => {
      try {
        setImportResult(await importAccountFolderFromDrive(importAccountId, importFolderInput));
        setImportFolderInput("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to import from Drive.");
      }
    });
  }

  function handleDisconnect() {
    setError(null);
    startTransition(async () => {
      try {
        await disconnectGoogleDrive();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to disconnect.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {connected ? <CloudCheckIcon className="size-4 text-emerald-600" /> : <CloudIcon className="size-4 text-muted-foreground" />}
          <span className="font-medium">Google Drive</span>
          {connected && email && <span className="text-sm text-muted-foreground">Connected as {email}</span>}
        </div>
        {connected ? (
          <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={isPending}>
            Disconnect
          </Button>
        ) : (
          <Button size="sm" render={<Link href="/api/google-drive/authorize" />}>
            Connect Google Drive
          </Button>
        )}
      </div>

      {connected && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Paste a Google Drive folder link or ID"
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleListFiles} disabled={isPending || !folderInput.trim()}>
              {isPending ? "Listing…" : "List files"}
            </Button>
          </div>

          <div className="flex flex-col gap-2 border-t pt-3">
            <span className="text-sm font-medium">Import statements into an account</span>
            {manualAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add a manual account to import into.</p>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={importAccountId}
                  onChange={(e) => {
                    setImportAccountId(e.target.value);
                    setImportFolderInput("");
                    setImportResult(null);
                  }}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  {manualAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder={
                    importAccount?.google_drive_folder_id
                      ? "Folder linked — paste a new link to change it"
                      : "Paste this account's Drive folder link or ID"
                  }
                  value={importFolderInput}
                  onChange={(e) => setImportFolderInput(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleImport}
                  disabled={isPending || !importAccountId || (!importFolderInput.trim() && !importAccount?.google_drive_folder_id)}
                >
                  {isPending ? "Importing…" : "Import from Drive"}
                </Button>
              </div>
            )}

            {importResult && (
              <div className="flex flex-col gap-1 text-sm">
                <p>
                  {importResult.inserted} new transaction{importResult.inserted === 1 ? "" : "s"} imported,{" "}
                  {importResult.skipped} already present.
                </p>
                {importResult.files.length === 0 && (
                  <p className="text-muted-foreground">No .csv files found in that folder.</p>
                )}
                <ul className="flex flex-col gap-1">
                  {importResult.files.map((file) => (
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
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {files &&
            (files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files found in that folder.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-4">
                    <span className="truncate">{file.name}</span>
                    <span className="shrink-0 text-muted-foreground">{formatDateTime(file.modifiedTime)}</span>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      )}
    </div>
  );
}
