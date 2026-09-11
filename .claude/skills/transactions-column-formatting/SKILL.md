---
name: transactions-column-formatting
description: Use when touching how the Transactions table (src/app/transactions/transactions-table.tsx) formats or renders its own Date, Amount, or Class column values — these are bespoke to this one table's renderCell, not part of the shared table-page-conventions architecture or the cross-page amount-color-conventions rule.
---

# Transactions table column formatting

These are presentation choices specific to `transactions-table.tsx`'s
`renderCell`, not shared with the other list pages.

- **Amount has no currency symbol.** `formatCurrency` uses
  `Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2,
  maximumFractionDigits: 2 })` (plain decimal style) instead of `style:
  "currency", currency: "BRL"` — it renders `1.234,56`, not `R$ 1.234,56`.
  This is local to this file; every other page's own `formatCurrency`
  copy (Accounts' balance, Budget's planned/actual/variance, the
  Dashboard's cards, the month header) still uses currency style and
  keeps the `R$` symbol — don't change those unless asked.
- **Date drops the year and abbreviates the month**: `formatDate` renders
  `DD - mmm` (e.g. `11 - set`) via a local `MONTH_ABBREVIATIONS` array
  (`["jan", "fev", ..., "dez"]`, no periods), reading `getUTCDate()` /
  `getUTCMonth()` off the transaction's date string. The year is omitted
  because the month/year is already shown in the page header above the
  table (`formatMonthLabel` in `transactions/page.tsx`).
- **Class renders as the same `Badge` chip as Category** (`variant="secondary"
  className="max-w-full gap-1 truncate"`), instead of plain text — for
  visual consistency between the two columns. Unlike Category's badge, it
  has no leading `CategoryIcon`, since `Class` (`src/lib/supabase/types.ts`)
  has no `icon` field of its own — only `Category` does.
