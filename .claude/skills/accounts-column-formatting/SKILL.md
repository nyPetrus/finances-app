---
name: accounts-column-formatting
description: Use when touching how the Accounts table (src/app/accounts/accounts-table.tsx) formats its own columns — Balance, Last sync, or the single-line/no-horizontal-scroll layout of Name/Source/Type, or Name being the one user-editable account name (no separate Account alias) — bespoke to this one table's renderCell and COLUMNS, not part of the shared table-page-conventions architecture.
---

# Accounts table column formatting

- **Balance has no currency symbol.** `formatCurrency` uses
  `Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2,
  maximumFractionDigits: 2 })` (plain decimal style) instead of `style:
  "currency", currency: "BRL"` — it renders `1.234,56`, not `R$ 1.234,56`.
  This is local to this file's own `formatCurrency` copy; Budget's
  planned/actual/variance and the month header keep currency style and the
  `R$` symbol — don't change those unless asked.
  **Why:** matches the Transactions table's Amount column (see
  `transactions-column-formatting`). The Dashboard has no `R$` anywhere any
  more either — its 6 stat cards used to be the one place that kept it,
  but they were removed (see `dashboard-conventions`'s "removed-cards"
  history); everything left there is chart- or table-shaped and no-symbol
  like this file (see `dashboard-conventions`/`dashboard-monthly-table`).
- **"Last update" (column key still `lastSync`, so saved sort/column
  prefs keep working) means different things per account kind**, via
  `lastUpdateOf`: automatic accounts show `updated_at` (stamped only by
  Pluggy sync — `updateAccount` deliberately leaves it alone), manual
  accounts show `last_imported_at` (migration 0024), stamped by
  `markAccountImported` (`src/lib/import/statement-import.ts`) whenever a
  CSV upload or Drive folder import reads at least one file without
  error — even if every row was a duplicate. Null (never imported) → `—`.
  Renamed from "Last sync" per explicit user request.
- **Last update is compact and never wraps**: `formatDateTime` builds
  `DD/MM/YY HH:mm` (e.g. `11/09/25 14:30`) manually from `Date` getters
  (local time, not UTC — this is a real timestamp, not a date-only
  string) instead of `Intl.DateTimeFormat(..., { dateStyle: "short",
  timeStyle: "short" })`, which produced a longer, comma-separated string.
  Unlike the Transactions Date column, the year is kept (2-digit) since
  Accounts has no page-level month/year header to make it redundant.
- **Every column keeps its row to a single line, and the table avoids
  horizontal scroll by letting the Account name shrink instead of
  wrapping.** `COLUMNS` gives Account `cellClassName: "max-w-56
  font-medium"` (the `truncate` lives on the inner name span, with
  `min-w-0`, so the icon and Inactive badge stay visible) (free text that can be arbitrarily
  long; Source used to get `max-w-32 truncate` too, until it became an
  icon) and
  Last update/Balance `whitespace-nowrap` (structured values that should
  never break across two lines). This overrides the shared `TableCell`'s
  default wrapping (see `table-page-conventions`) specifically for this
  table. **The `max-w-*` paired with each `truncate` is load-bearing, not
  decorative** — see `table-page-conventions`'s "A column's `cellClassName:
  truncate`..." bullet for why `truncate` alone doesn't shrink a column in
  this app's tables. The page (`src/app/accounts/page.tsx`) also uses
  `max-w-5xl` (matching Transactions, the widest list page) rather than a
  narrower container, to give these columns enough room that typical
  values render in full without needing to lean on the ellipsis at all.
- **There is no Type column — the type icon leads the name in one
  "Account" column** (column key still `name`; header `LandmarkIcon` +
  "Account"): `<span className="inline-flex max-w-full items-center
  gap-2">` holding `AccountTypeIcon` (type name as `title` tooltip), then
  the name in `<span className="min-w-0 truncate">`, then the Inactive
  badge. Icon first, then name — the same composition as every account
  display and picker in the app (icons always sit left of names, per
  explicit user request, 2026-10-03; it used to be name first, icon last).
  Merged per explicit user request; `"type"` was dropped from `SORT_KEYS`
  (sorting is by name). The phone card shows the icon before the name too.
- **There is no Source column any more — the source icon leads the Last
  update value instead** (muted, then the time or `—`), since the source
  is what says what that time means (plug = synced at, file = imported
  at). Merged per explicit user request; `"source"` was dropped from
  `SORT_KEYS` too (a stale `?sort=source` just falls back, and
  `useColumnPreferences` drops the unknown key from stored orders). The
  phone card shows `<type icon> <source icon> <time>` (no separate ↻
  icon). `AccountSourceIcon` (`src/components/account-type-icon.tsx`),
  keyed on `is_automatic`, **not** on the free-text `source` — Pluggy
  writes its connector's name there ("MeuPluggy"), so any future
  connector still gets the plug. Automatic → `PlugZapIcon` (same as the
  "Connect bank" menu item), manual → `FileUpIcon` (manual accounts are
  fed by statement file imports); the tooltip is the actual `source`
  text. Both per explicit user request.
- **Name is the origin-table identity column, so its header is icon+text**
  (`LandmarkIcon`, via `headerIcon` — see `table-page-conventions`'s
  "Column header icons" bullet).
- **Name is the only account name — there is no separate "Account"
  alias column/field any more.** It used to be a short user nickname
  (`accounts.label`, migration 0014) shown as an "Account" column and in
  the transaction tables, because Pluggy sync overwrote `name` on every
  run. Per explicit user request, sync now sets `name` only when it first
  inserts an account (`syncPluggyItem` in `pluggy-actions.ts` does a
  separate update — without `name` — for accounts that already exist,
  rather than an upsert, since `name` is NOT NULL and an upsert payload
  without it fails), so the user's edits to Name stick; migration 0019
  copied every alias into `name` and dropped `label`. Every other place
  that shows an account (Search/Dashboard transaction tables' Account
  column, the Search Account filter) uses `account.name`. Sync still
  overwrites Source, Type and the balance — only Name is user-owned.
- **"Connect bank" and "Sync" live in this table's own toolbar** (right/
  specific zone), not in `accounts/page.tsx` — see `table-page-conventions`'s
  "Connect bank" bullet. `page.tsx` now renders only a plain `<h1>Accounts</h1>`.
- **On phones (below `sm`) the table becomes a card list** (inline in
  `accounts-table.tsx`, table and cards both rendered, toggled with
  `sm:hidden` / `hidden sm:block`). Each card: checkbox, then name (+
  Inactive badge) over `<type icon> <source icon> last update` (omitted when
  there's none, i.e. a manual account never imported), with Balance on the right and the transactions
  total under it, prefixed `Σ` (tooltips don't exist on touch, so the
  symbol is the label). Same value formatting as the columns. **Tapping a
  card opens the edit dialog**, the same phone-only exception Search's
  cards make to "Edit lives only in ⋮". Sorting uses the shared
  `CardListHeader` (URL-driven, via `sortHref(column, dir)`); `ColumnsMenu`
  is hidden below `sm`. Per explicit user request.
