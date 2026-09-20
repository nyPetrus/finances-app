# Handoff: Google Drive account folders

Paste this as the first message of a new session, or ask Claude to read this
file. Delete it once the work it describes is done.

Continue the Google Drive work in this project (finances-app). Read the
google-drive-conventions skill first.

## Goal
Create a Google Drive folder structure where each subfolder is one
account's folder and holds that account's bank-statement/transaction files.
An "Update accounts folders" action should read those files and import the
transactions into the app. This is for accounts that Pluggy can't sync.

## Already built (commit 5c59baf, "Add Google Drive connect + on-demand folder file listing")
- OAuth connect/disconnect. Scope is drive.readonly plus userinfo.email.
  - src/app/api/google-drive/authorize/route.ts and callback/route.ts
  - The redirect URI is computed from the request origin, so both
    localhost:3000 and the Vercel URL must be Authorized redirect URIs on the
    Google Cloud OAuth client.
- Token storage: one row per user in google_drive_tokens
  (supabase/migrations/0016_google_drive_tokens.sql). getValidAccessToken()
  in src/app/accounts/google-drive-actions.ts refreshes the token when it
  has under 60s left. All Drive calls must go through it.
- src/lib/google-drive/client.ts: a raw-fetch Google client with no
  googleapis package. It has token exchange/refresh/revoke, fetchGoogleEmail,
  extractDriveFolderId (accepts a bare id or a /folders/<id> link), and
  listDriveFilesInFolder.
- src/app/accounts/google-drive-panel.tsx: a card above AccountsTable with
  connect/disconnect, a pasted folder link/ID input, and a "List files"
  button showing name + modifiedTime.

## Not built yet (don't assume it exists)
- Mapping a Drive folder to an account (no column or table for it)
- Listing the subfolders of a parent folder (listDriveFilesInFolder returns
  files and folders mixed, with no filter on mimeType)
- Downloading and parsing statement files
- Importing transactions, with dedupe
- The "Update accounts folders" bulk button

## Design decisions to keep
- Every Drive read is a user-initiated click. No cron or background job
  (deliberate; see the skill for why).
- The client stays a pure API client (server-only, no Supabase). DB
  orchestration lives in the server actions.
- Migrations are applied manually in the Supabase SQL Editor, so tell me to
  run any new file there.

## Things to check while building
- listDriveFilesInFolder uses pageSize 100 and ignores nextPageToken, so
  folders with more than 100 files get silently truncated. It's the same
  kind of problem as PITFALLS.md.
- Imported descriptions must follow the lowercase rule (see the
  transaction-description-rules skill).
- Follow the dedupe approach in src/app/accounts/pluggy-actions.ts (it
  pages its existing-ids lookup) so re-imports don't create duplicates.

## Open questions to settle first
1. What file formats do the banks export (CSV, OFX, XLSX, PDF)?
2. How should a subfolder be tied to an account: by folder name, or by a
   stored folder id on the account?
3. Should the parent folder be set once and its subfolders auto-discovered,
   or should each account get its own pasted link?
4. Which accounts need this (the ones Pluggy can't sync)?

Start with questions 1-3, then propose a plan before writing code.

## Not verified from the code
- Whether migration 0016 has been run in the Supabase project.
- Whether the Google Cloud setup (test user and redirect URIs) is finished.
- Whether the Drive folder structure already exists.
