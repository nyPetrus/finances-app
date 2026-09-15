---
name: transactions-column-formatting
description: Use when touching how the Transactions table (src/app/transactions/transactions-table.tsx) formats or renders its own Date, Amount, Account, or Class column values — these are bespoke to this one table's renderCell, not part of the shared table-page-conventions architecture or the cross-page amount-color-conventions rule.
---

# Transactions table column formatting

These are presentation choices specific to `transactions-table.tsx`'s
`renderCell`, not shared with the other list pages.

- **Amount has no currency symbol.** `formatCurrency` uses
  `Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2,
  maximumFractionDigits: 2 })` (plain decimal style) instead of `style:
  "currency", currency: "BRL"` — it renders `1.234,56`, not `R$ 1.234,56`.
  Accounts' Balance column (`accounts-table.tsx`) mirrors this same
  no-symbol style (its own local `formatCurrency` copy), and so does the
  Dashboard's embedded transactions table (see `dashboard-conventions`)
  and its monthly breakdown table (see `dashboard-monthly-table`, which
  additionally rounds to 0 decimals) — the `R$` symbol is reserved for the
  Dashboard's 6 stat cards specifically (`dashboard-cards`), not anything
  chart- or table-shaped. Budget's planned/actual/variance and the month
  header still keep their own `formatCurrency` copy with currency style
  and the `R$` symbol — don't change those unless asked.
- **Date abbreviates the month, uses a 2-digit year, and never wraps**:
  `formatDate` renders `DD mmm YY` (e.g. `11 set 26`) via a local
  `MONTH_ABBREVIATIONS` array (`["jan", "fev", ..., "dez"]`, no periods),
  reading `getUTCDate()` / `getUTCMonth()` / `getUTCFullYear()` off the
  transaction's date string (year sliced to its last 2 digits). This is
  the same format on the Dashboard's embedded table
  (`dashboard-transactions-table.tsx` — a separate copy, kept in sync by
  hand, see `dashboard-conventions`), by explicit user request; it used to
  drop the year entirely there since the month/year is already shown in
  the page header above the Transactions table (`formatMonthLabel` in
  `transactions/page.tsx`) — that reasoning no longer applies now that the
  year prints inline. The Date column also sets `cellClassName:
  "whitespace-nowrap"` in `COLUMNS` — needed because the shared
  `TableCell` wraps by default (see `table-page-conventions`), and `DD mmm
  YY` has spaces that would otherwise let it break across lines in a
  narrow column.
- **Account and Class render as a `Badge` chip**
  (`variant="secondary" className="max-w-full gap-1 truncate"`), instead
  of plain text. Unlike Category (which is icon-only, no `Badge` — see
  `table-page-conventions`'s "Category-as-foreign-column" bullet), neither
  has a leading `CategoryIcon`, since `Account` and `Class`
  (`src/lib/supabase/types.ts`) have no `icon` field of their own — only
  `Category` does.
- **Description, Account, and Class also need a `max-w-*` on the cell
  alongside `truncate`** (`max-w-64`, `max-w-40`, `max-w-40` respectively
  in `COLUMNS`' `cellClassName`) — see `table-page-conventions`'s
  "A column's `cellClassName: truncate`..." bullet for why the `truncate`
  on the `Badge` itself isn't enough on its own.
- **Account, Category, and Class headers are icon-only** (`LandmarkIcon`,
  `TagIcon`, `TagsIcon` respectively — see `table-page-conventions`'s
  "Column header icons" bullet), even though only Category's *cell* is
  icon-only — Account and Class still render their cell as a `Badge` chip
  per the bullet above. The header icon and the cell rendering are
  independent choices; don't assume a column's header icon implies its
  cell dropped the `Badge`.
