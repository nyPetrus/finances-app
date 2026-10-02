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
  horizontal scroll by letting Name/Source shrink instead of
  wrapping.** `COLUMNS` gives Name/Source `cellClassName:
  "max-w-56 truncate font-medium"` / `"max-w-32 truncate"` (free-text fields that can be arbitrarily long) and
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
- **Type is icon-only** (`AccountTypeIcon`, name as `title` tooltip,
  centered column — the app-wide symbol-display rule, see
  `table-page-conventions`); the phone card shows the same icon.
- **Source renders as a `Badge` chip**
  (`variant="secondary"`). It additionally gets
  `className="max-w-full gap-1 truncate"` on the `Badge` itself — it's free
  text (`account.source`) that could in principle be long, and `Badge`'s own `w-fit shrink-0` would otherwise let a long value
  stretch the table wider than its container. Source falls back to a plain
  muted `"—"` span when the value is null.
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
  Inactive badge) over `<type icon> Source · ↻ last update` (omitted when
  there's none, i.e. a manual account never imported), with Balance on the right and the transactions
  total under it, prefixed `Σ` (tooltips don't exist on touch, so the
  symbol is the label). Same value formatting as the columns. **Tapping a
  card opens the edit dialog**, the same phone-only exception Search's
  cards make to "Edit lives only in ⋮". Sorting uses the shared
  `CardListHeader` (URL-driven, via `sortHref(column, dir)`); `ColumnsMenu`
  is hidden below `sm`. Per explicit user request.
