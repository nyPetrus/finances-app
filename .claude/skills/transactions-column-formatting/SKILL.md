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
  no-symbol style (its own local `formatCurrency` copy). Budget's
  planned/actual/variance, the Dashboard's cards, and the month header
  each still keep their own `formatCurrency` copy with currency style and
  the `R$` symbol — don't change those unless asked.
- **Date drops the year, abbreviates the month, and never wraps**:
  `formatDate` renders `DD - mmm` (e.g. `11 - set`) via a local
  `MONTH_ABBREVIATIONS` array (`["jan", "fev", ..., "dez"]`, no periods),
  reading `getUTCDate()` / `getUTCMonth()` off the transaction's date
  string. The year is omitted because the month/year is already shown in
  the page header above the table (`formatMonthLabel` in
  `transactions/page.tsx`). The Date column also sets
  `cellClassName: "whitespace-nowrap"` in `COLUMNS` — needed because the
  shared `TableCell` wraps by default (see `table-page-conventions`), and
  `DD - mmm` has a space that would otherwise let it break onto two lines
  in a narrow column.
- **Account and Class render as the same `Badge` chip as Category**
  (`variant="secondary" className="max-w-full gap-1 truncate"`), instead
  of plain text — for visual consistency across the badge-style columns.
  Unlike Category's badge, neither has a leading `CategoryIcon`, since
  `Account` and `Class` (`src/lib/supabase/types.ts`) have no `icon` field
  of their own — only `Category` does.
