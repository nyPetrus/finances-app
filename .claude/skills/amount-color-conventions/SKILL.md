---
name: amount-color-conventions
description: Use when displaying a raw income/expense amount anywhere in the app (the Search/Dashboard transaction tables' Amount column, Search's results-summary total, the Dashboard's monthly breakdown table) — the color rule differs by context, and differs from Budget's planned-vs-actual variance colors, which are a separate concept.
---

# Amount color conventions

**Transaction tables (`search/search-table.tsx`, the Dashboard's
`dashboard-transactions-table.tsx`) and Search's results-summary total:
negative/expense amounts don't get a special color — only positive
(income) amounts do.** (The old Transactions page and its month header
were removed; Search replaced them.) A positive amount is
`text-emerald-600`; a negative one just uses the default text color (no
class, or explicitly omit the color class rather than adding
`text-foreground`). Transfers stay `text-muted-foreground` regardless of
sign.

**The Dashboard's monthly breakdown table (`dashboard-monthly-table.tsx`,
`TYPE_COLOR` — see `dashboard-monthly-table`) is the deliberate exception
to that rule: its Expenses Type row is `text-destructive` unconditionally**
(the value is already negative, no sign-flipping needed), not the "no
color" treatment the rule above would otherwise give it. Don't propagate
this back to the Transactions table or the month header.
**Why:** this was an explicit, scoped-to-the-Dashboard decision. The rule
used to live on 6 stat cards above this table (Income `text-emerald-600`
unconditional, Balance conditional on its own sign, Accounts/Transfers/
Uncategorized uncolored) — all since removed per explicit user request,
see `dashboard-conventions`'s "removed-cards" history; the monthly table
kept the Income/Expenses half of the rule on its own merits.

**`chart-colors.ts`'s `EXPENSE_HUE`/`INCOME_HUE`/`TRANSFER_HUE` (and their
flat counterparts `EXPENSE_FLAT`/`INCOME_FLAT`/`TRANSFER_FLAT`, plus
`sequentialColor(hue, rank, count)` for a same-hue lightness ramp) are
unused anywhere in the app right now, but are kept rather than deleted —
if a future Dashboard chart needs "the app's red/green/gray," pull the
constant from `chart-colors.ts` rather than reading `--destructive` or
typing a new hex; that file is the single source of truth for these three
hues** (derived from `--destructive`, Tailwind's built-in `emerald-600`,
and `--muted-foreground` respectively).
**Why:** the Dashboard used to have Expenses-by-month and
category-breakdown charts that traced back to these same three tokens —
all removed per explicit user request (see `dashboard-conventions`'s
"removed charts" history), leaving the tokens themselves as an
already-derived set of design tokens worth keeping.

**This is distinct from Budget's planned-vs-actual variance column
(`monthly-execution.tsx`), which is a different concept (over/under
budget, not income vs. expense) and keeps its own red/green pair** — don't
conflate the two when touching either.
