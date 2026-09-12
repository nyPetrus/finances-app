---
name: accounts-column-formatting
description: Use when touching how the Accounts table (src/app/accounts/accounts-table.tsx) formats its own columns — Balance, Last sync, or the single-line/no-horizontal-scroll layout of Account/Name/Source/Type — bespoke to this one table's renderCell and COLUMNS, not part of the shared table-page-conventions architecture.
---

# Accounts table column formatting

- **Balance has no currency symbol**, matching the Transactions table's
  Amount column (see `transactions-column-formatting`). `formatCurrency`
  uses `Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2,
  maximumFractionDigits: 2 })` (plain decimal style) instead of `style:
  "currency", currency: "BRL"` — it renders `1.234,56`, not `R$ 1.234,56`.
  This is local to this file's own `formatCurrency` copy; every other
  page's copy (Budget's planned/actual/variance, the Dashboard's cards,
  the month header) keeps currency style and the `R$` symbol — don't
  change those unless asked.
- **Last sync is compact and never wraps**: `formatDateTime` builds
  `DD/MM/YY HH:mm` (e.g. `11/09/25 14:30`) manually from `Date` getters
  (local time, not UTC — this is a real timestamp, not a date-only
  string) instead of `Intl.DateTimeFormat(..., { dateStyle: "short",
  timeStyle: "short" })`, which produced a longer, comma-separated string.
  Unlike the Transactions Date column, the year is kept (2-digit) since
  Accounts has no page-level month/year header to make it redundant.
- **Every column keeps its row to a single line, and the table avoids
  horizontal scroll by letting Account/Name/Source shrink instead of
  wrapping.** `COLUMNS` gives Account/Name/Source `cellClassName:
  "max-w-40 truncate"` / `"max-w-56 truncate font-medium"` /
  `"max-w-32 truncate"` (free-text fields that can be arbitrarily long) and
  Last sync/Balance `whitespace-nowrap` (structured values that should
  never break across two lines). This overrides the shared `TableCell`'s
  default wrapping (see `table-page-conventions`) specifically for this
  table. **The `max-w-*` paired with each `truncate` is load-bearing, not
  decorative** — see `table-page-conventions`'s "A column's `cellClassName:
  truncate`..." bullet for why `truncate` alone doesn't shrink a column in
  this app's tables. The page (`src/app/accounts/page.tsx`) also uses
  `max-w-5xl` (matching Transactions, the widest list page) rather than a
  narrower container, to give these three columns enough room that typical
  values render in full without needing to lean on the ellipsis at all.
- **Account, Source, and Type render as a `Badge` chip**
  (`variant="secondary"`), the same treatment as the Categories table's
  Type column (see `table-page-conventions`). Account and Source additionally
  get `className="max-w-full gap-1 truncate"` on the `Badge` itself — unlike
  Categories' Type (a short, bounded enum label), both are free text
  (`account.label`/`account.source`) that could in principle be long, and
  `Badge`'s own `w-fit shrink-0` would otherwise let a long value stretch
  the table wider than its container. Type doesn't need this since
  `typeLabels` are always short. All three fall back to a plain muted
  `"—"` span when the value is null (Type is never null, so it never needs
  the fallback).
- **Name is the origin-table identity column, so its header is icon+text**
  (`LandmarkIcon`, via `headerIcon` — see `table-page-conventions`'s
  "Column header icons" bullet); Account (the short label column) stays
  plain text, it isn't the identity column.
- **"Connect bank" and "Sync" live in this table's own toolbar** (right/
  specific zone), not in `accounts/page.tsx` — see `table-page-conventions`'s
  "Connect bank" bullet. `page.tsx` now renders only a plain `<h1>Accounts</h1>`.
