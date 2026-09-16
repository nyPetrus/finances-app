---
name: amount-color-conventions
description: Use when displaying a raw income/expense amount anywhere in the app (Transactions table's Amount column, the month header's income/expense summary, the Dashboard's monthly breakdown table) — the color rule differs by context, and differs from Budget's planned-vs-actual variance colors, which are a separate concept.
---

# Amount color conventions

**Transactions table and the month header (`transactions-table.tsx`,
`transactions/page.tsx`): negative/expense amounts don't get a special
color — only positive (income) amounts do.** A positive amount is
`text-emerald-600`; a negative one just uses the default text color (no
class, or explicitly omit the color class rather than adding
`text-foreground`). Transfers stay `text-muted-foreground` regardless of
sign.

**The Dashboard's monthly breakdown table (`dashboard-monthly-table.tsx`,
`TYPE_COLOR` — see `dashboard-monthly-table`) is the deliberate exception
to that rule** — its Expenses Type row is `text-destructive`
unconditionally (the value is already negative, no sign-flipping needed),
not the "no color" treatment the rule above would otherwise give it. This
was an explicit, scoped-to-the-Dashboard decision; don't propagate it back
to the Transactions table or the month header. (This rule used to live on
6 stat cards above this table — Income `text-emerald-600` unconditional,
Balance conditional on its own sign, Accounts/Transfers/Uncategorized
uncolored — all since removed per explicit user request, see
`dashboard-conventions`'s "removed-cards" history; the monthly table kept
the Income/Expenses half of the rule on its own merits.)

**The Dashboard used to have Expenses-by-month and category-breakdown
charts that traced back to the same three tokens as the cards, via
`src/lib/chart-colors.ts` — all were removed per explicit user request**
(see `dashboard-conventions`'s "removed charts" history). `EXPENSE_HUE`/
`INCOME_HUE`/`TRANSFER_HUE` (and their flat single-color counterparts
`EXPENSE_FLAT`/`INCOME_FLAT`/`TRANSFER_FLAT`), derived from
`--destructive`, Tailwind's built-in `emerald-600`, and
`--muted-foreground` respectively, plus `sequentialColor(hue, rank,
count)` for a same-hue lightness ramp, are unused anywhere in the app now
as a result — still intentionally kept in `chart-colors.ts` rather than
deleted, as an already-derived set of design tokens. If a future Dashboard
chart needs "the app's red/green/gray," pull the constant from
`chart-colors.ts` rather than reading `--destructive` or typing a new hex
— that file is the single
source of truth for these three hues.

This is distinct from Budget's planned-vs-actual variance column
(`monthly-execution.tsx`), which is a different concept (over/under budget,
not income vs. expense) and keeps its own red/green pair; don't conflate the
two when touching either.
