---
name: amount-color-conventions
description: Use when displaying a raw income/expense amount anywhere in the app (Transactions table's Amount column, the month header's income/expense summary, the Dashboard's stat cards and charts) — the color rule differs by context, and differs from Budget's planned-vs-actual variance colors, which are a separate concept.
---

# Amount color conventions

**Transactions table and the month header (`transactions-table.tsx`,
`transactions/page.tsx`): negative/expense amounts don't get a special
color — only positive (income) amounts do.** A positive amount is
`text-emerald-600`; a negative one just uses the default text color (no
class, or explicitly omit the color class rather than adding
`text-foreground`). Transfers stay `text-muted-foreground` regardless of
sign.

**The Dashboard (`src/app/page.tsx`) is the deliberate exception to that
rule** — its Expenses card is `text-destructive` unconditionally (the
value is already negative, no sign-flipping needed), not the "no color"
treatment the rule above would otherwise give it. This was an explicit,
scoped-to-the-Dashboard decision; don't propagate it back to the
Transactions table or the month header. The Dashboard's other stat cards:
Income is `text-emerald-600` (unconditional, matches the shared rule); Net
is *conditional* — `net >= 0 ? "text-emerald-600" : "text-destructive"`,
green when positive and red when negative (this is the one card on the
page whose color depends on its own value's sign, not a fixed rule);
Balance has no color treatment at all.

**The Dashboard's charts all trace back to the same three tokens as the
cards, via `src/lib/chart-colors.ts` — never hand-pick a hex for a new
Dashboard chart color.** `EXPENSE_HUE`/`INCOME_HUE`/`TRANSFER_HUE` (and
their flat single-color counterparts `EXPENSE_FLAT`/`INCOME_FLAT`/
`TRANSFER_FLAT`) are derived from `--destructive`, Tailwind's built-in
`emerald-600`, and `--muted-foreground` respectively (see
`dashboard-conventions` for the full derivation and the sequential-scale
math). The "Income x Expenses x Transfers" monthly chart uses the flat
colors directly, one per series; the three category-breakdown charts
(Expenses/Income/Transfer by category) use `sequentialColor(hue, rank,
count)` to get a same-hue lightness ramp instead. If a future Dashboard
chart needs "the app's red/green/gray," pull the constant from
`chart-colors.ts` rather than reading `--destructive` or typing a new hex —
that file is the single source of truth for these three hues.

This is distinct from Budget's planned-vs-actual variance column
(`monthly-execution.tsx`), which is a different concept (over/under budget,
not income vs. expense) and keeps its own red/green pair; don't conflate the
two when touching either.
