---
name: amount-color-conventions
description: Use when displaying a raw income/expense amount anywhere in the app (Transactions table's Amount column, the month header's income/expense summary, the Dashboard's Income/Expenses cards) — the color rule differs from Budget's planned-vs-actual variance colors, which are a separate concept.
---

# Amount color conventions

Negative/expense amounts don't get a special color — only positive (income)
amounts do. A positive amount is `text-emerald-600`; a negative one just uses
the default text color (no class, or explicitly omit the color class rather
than adding `text-foreground`). Transfers stay `text-muted-foreground`
regardless of sign.

Applies everywhere a raw income/expense amount is displayed: the
Transactions table's Amount column (`transactions-table.tsx`), the month
header's income/expense summary (`transactions/page.tsx`), and the
Dashboard's Expenses card (`src/app/page.tsx`) — the Dashboard's Income card
keeps its green.

This is distinct from Budget's planned-vs-actual variance column
(`monthly-execution.tsx`), which is a different concept (over/under budget,
not income vs. expense) and keeps its own red/green pair; don't conflate the
two when touching either.
