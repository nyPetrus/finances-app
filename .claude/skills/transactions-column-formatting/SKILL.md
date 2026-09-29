---
name: transactions-column-formatting
description: Use when touching how the transaction tables (src/app/search/search-table.tsx and its Dashboard copy dashboard-transactions-table.tsx) format or render their own Date, Amount, Account, or Class column values — these are bespoke to these tables' renderCell, not part of the shared table-page-conventions architecture or the cross-page amount-color-conventions rule.
---

# Transactions table column formatting

These are presentation choices specific to the transaction tables'
`renderCell` — `search/search-table.tsx` (the main one since the old
Transactions page and its `transactions-table.tsx` were removed) and the
Dashboard's hand-synced copy `dashboard-transactions-table.tsx` — not
shared with the other list pages.

- **Amount has no currency symbol.** `formatCurrency` uses
  `Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2,
  maximumFractionDigits: 2 })` (plain decimal style) instead of `style:
  "currency", currency: "BRL"` — it renders `1.234,56`, not `R$ 1.234,56`.
  Accounts' Balance column (`accounts-table.tsx`) mirrors this same
  no-symbol style (its own local `formatCurrency` copy), and so does the
  Dashboard's embedded transactions table (see `dashboard-conventions`)
  and its monthly breakdown table (see `dashboard-monthly-table`, which
  additionally rounds to 0 decimals). Budget's planned/actual/variance
  still keeps its own `formatCurrency` copy with
  currency style and the `R$` symbol — don't change those unless asked.
  **Why:** the `R$` symbol used to be reserved for the Dashboard's 6 stat
  cards specifically, but those were removed (see `dashboard-conventions`'s
  "removed-cards" history) and nothing on the Dashboard shows `R$` any
  more now.
- **Date is `dd mmm` (no year) and never wraps**: `formatDate` renders
  e.g. `11 set` via a local `MONTH_ABBREVIATIONS` array (`["jan", "fev",
  ..., "dez"]`, no periods), reading `getUTCDate()` / `getUTCMonth()` off
  the transaction's date string. This is the same format on the
  Dashboard's embedded table (`dashboard-transactions-table.tsx` — a
  separate copy, kept in sync by hand, see `dashboard-conventions`). The
  Date column also sets `cellClassName: "whitespace-nowrap"` in `COLUMNS`
  — needed because the shared `TableCell` wraps by default (see
  `table-page-conventions`), and `dd mmm` has a space that would otherwise
  let it break across lines in a narrow column.
  **Why:** `dd mmm` is by explicit user request (2026-09-29), replacing
  the earlier `DD mmm YY` — don't add the year back unless asked.
- **Account and Class render as a `Badge` chip**
  (`variant="secondary" className="max-w-full gap-1 truncate"`), instead
  of plain text. Unlike Category (which is icon-only, no `Badge` — see
  `table-page-conventions`'s "Category-as-foreign-column" bullet), neither
  has a leading `CategoryIcon`. `Account` has no `icon` field at all;
  `Class` does now (`classes.icon`), but switching the Class column to
  icon-only here hasn't been asked for yet — see `table-page-conventions`'s
  symbol-display rule before changing it.
- **Description, Account, and Class also need a `max-w-*` on the cell
  alongside `truncate`** (`max-w-64`, `max-w-40`, `max-w-40` respectively
  in `COLUMNS`' `cellClassName`) — see `table-page-conventions`'s
  "A column's `cellClassName: truncate`..." bullet for why the `truncate`
  on the `Badge` itself isn't enough on its own.
- **Account, Category, and Class headers are icon-only** (`LandmarkIcon`,
  `BoxIcon`, `TagIcon` respectively — see `table-page-conventions`'s
  "Column header icons" bullet), even though only Category's *cell* is
  icon-only — Account and Class still render their cell as a `Badge` chip
  per the bullet above. The header icon and the cell rendering are
  independent choices; don't assume a column's header icon implies its
  cell dropped the `Badge`.
