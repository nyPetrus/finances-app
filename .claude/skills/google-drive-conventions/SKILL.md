---
name: google-drive-conventions
description: Use when touching Google Drive integration (src/lib/google-drive/client.ts, src/app/accounts/google-drive-actions.ts, src/app/accounts/google-drive-panel.tsx, src/app/api/google-drive/*, supabase/migrations/0016_google_drive_tokens.sql) — the OAuth connect/callback flow, token storage/refresh, or reading files out of a Drive folder on demand.
---

# Google Drive conventions

Lets the user connect their Google account once, then read files out of a
Drive folder on demand (a button click) — the intended end state is one
folder per non-Pluggy-syncable account, each holding bank-exported
statement files the app imports from. **What exists right now:** connect,
"list files in a folder I paste a link for," and a per-account CSV import
(see the import bullet below) for *manual* accounts, one account at a
time. Not built yet: a parent folder with auto-discovered subfolders, an
"Update accounts folders" bulk button, and any bank format other than
Contabilizei Bank's CSV — don't assume they exist.

- **Every Drive read is a user-initiated click, never a background/cron
  job — this was an explicit, deliberate design decision, not a
  simplification to fix later.** It directly shapes the OAuth setup: an
  unverified Google app (see below) can have its refresh tokens expire:
  with an unattended background job, that's a silent failure nobody
  notices; with a button click, an expired token just means the next click
  surfaces a "reconnect" state, the same self-healing shape Pluggy's own
  "Connect" flow already has. Don't add a Vercel Cron / webhook-based
  trigger for this without revisiting that tradeoff first — it changes the
  risk profile of the OAuth scope/verification choice below.
- **OAuth scope is `drive.readonly` (+ `userinfo.email`), not
  `drive.file`.** `drive.file` is Google's "non-sensitive" scope (no
  verification review needed) but only grants access to files/folders the
  app itself created or that the user explicitly grants through Google's
  Picker UI — since the user creates these folders themselves in their own
  Drive (not through this app), `drive.file` would need a Picker
  integration to grant folder access. `drive.readonly` is simpler (any
  folder id/link just works, no Picker) at the cost of being a "sensitive"
  scope, which is why the app has to stay in Google Cloud Console's
  "Testing" publishing status with the user's own account listed as a test
  user rather than going through full verification — acceptable for a
  single-user personal app, and consistent with the "every read is a
  manual click" design above making token expiry low-stakes. Revisit this
  choice (probably switching to `drive.file` + Picker) only if re-auth
  friction actually becomes annoying in practice, not preemptively.
- **The OAuth client lives entirely in `src/lib/google-drive/client.ts`,
  raw `fetch` calls against Google's REST endpoints — no `googleapis`
  npm package.** That package pulls in the entire Google API surface for
  what's here three endpoints (token exchange, token refresh, list files)
  plus a userinfo call; matches this app's existing preference for a
  narrow, hand-rolled client over a heavy SDK for a small surface (compare
  `src/lib/pluggy/client.ts`, which *does* use `pluggy-sdk` — that one's
  justified because Pluggy's own SDK is the primary, actively-used
  integration with much more surface area). `client.ts` is `import
  "server-only"` and knows nothing about Supabase — it's a pure API
  client, same separation `pluggyClient` keeps from `pluggy-actions.ts`'s
  DB/business-logic layer.
- **Token storage/refresh**: one row per user in `google_drive_tokens`
  (`user_id` primary key, `refresh_token`, `access_token`,
  `access_token_expires_at`, `google_email`) — RLS-owned like every other
  table (`auth.uid() = user_id`). `getValidAccessToken()`
  (`google-drive-actions.ts`, not exported — internal to that file) reads
  the stored row, returns the cached `access_token` if it has more than 60
  seconds left before `access_token_expires_at`, otherwise calls
  `refreshGoogleAccessToken()` and writes the new token/expiry back before
  returning it. Every action that needs to call the Drive API goes through
  this — don't read `access_token` directly from the table elsewhere.
  `buildGoogleAuthorizeUrl()` always sets `prompt=consent` so Google
  re-issues a `refresh_token` even on a second connect (it's normally
  omitted after the first grant) — the callback route treats a missing
  `refresh_token` as an error rather than silently keeping a stale one.
- **The callback route computes its own redirect URI from the incoming
  request's origin** (`` `${request.nextUrl.origin}/api/google-drive/callback` ``,
  both in the authorize route that builds the Google auth URL and the
  callback route that exchanges the code) rather than a hardcoded env var
  — so it works unchanged across `localhost:3000` and the Vercel
  production URL, as long as **both are registered as Authorized redirect
  URIs on the Google Cloud OAuth client** (a manual step in Google Cloud
  Console, not something a code change can do — see `CLAUDE.md`'s env var
  bullet). If a redirect starts failing with a `redirect_uri_mismatch`
  from Google after changing where the app is hosted, check that console
  config first, not this code.
- **Disconnecting best-effort-revokes the token with Google
  (`revokeGoogleToken`, swallows any error) before deleting the DB row** —
  a revoke failure shouldn't block the user from clearing their own stored
  credential; the DB delete is the part that actually matters locally.
- **The connection-status read in `accounts/page.tsx` never throws on
  error, only checks `.data`** — deliberately, so that before the
  `0016_google_drive_tokens.sql` migration has been run (a manual
  Supabase SQL Editor step, see `CLAUDE.md`), the query's resulting
  "relation does not exist" error just reads as "not connected" instead
  of crashing the whole Accounts page. Don't tighten this to `if (error)
  throw` the way most other queries on that page do — this one specifically
  needs to degrade gracefully since, unlike most migrations, this table is
  read by a page that already existed and worked before this feature
  shipped.
- **UI lives in `accounts/google-drive-panel.tsx`**, a card above
  `AccountsTable` on the Accounts page — not wired into any specific
  account row. Shows
  connect/disconnect plus, once connected, a free-text folder link/ID
  input and a "List files" button that calls `listGoogleDriveFolderFiles()`
  and renders `{name, modifiedTime}` for each result. `extractDriveFolderId()`
  (`client.ts`) accepts either a bare folder id or a full
  `https://drive.google.com/drive/folders/<id>` link, since that's what a
  user actually copies from their browser.
- **Statement CSV import** (`importAccountFolderFromDrive` in
  `google-drive-actions.ts`, "Import from Drive" section of the panel).
  Migration `0017_drive_csv_import.sql` adds `accounts.google_drive_folder_id`
  (set/re-linked whenever a folder link is passed in; empty input reuses the
  stored one), `transactions.balance` (the bank's "Saldo do dia", stored as-is
  on every imported row) and `transactions.import_hash` (unique per account).
  The action lists every `.csv` in the folder (`listDriveFilesInFolder` now
  follows `nextPageToken`), downloads each with `downloadDriveFileText`, and
  parses it with `parseContabilizeiCsv` (`src/lib/google-drive/`, pure, no
  Drive/Supabase): BOM, `dd/mm/yyyy`, `"R$ 1.234,56"` with a non-breaking
  space, `-` for blank, amount = Entrada − Saída, description lowercased
  (see `transaction-description-rules`), `source = 'csv'`. Statements
  overlap (a boundary-day row appears in two files), so dedupe is by
  `import_hash` = sha256(date|amount|description|occurrence-within-file),
  checked against the account's stored hashes (paged with `.range()`, see
  `PITFALLS.md`) and against earlier files in the same run. A file that
  fails to parse is reported per-file in the result and doesn't abort the
  others. Dates are stored as naive midnight (`YYYY-MM-DDT00:00:00`), the
  same as the manual add form.
