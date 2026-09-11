---
name: accounts-column-formatting
description: Use when touching how the Accounts table (src/app/accounts/accounts-table.tsx) formats its own Balance column — bespoke to this one table's renderCell, not part of the shared table-page-conventions architecture.
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
