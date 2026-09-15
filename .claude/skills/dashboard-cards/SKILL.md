---
name: dashboard-cards
description: Use when touching the Dashboard's 6 stat cards (StatCard in src/app/dashboard-explorer.tsx, and the stats prop computed in src/app/page.tsx) — the card grid layout, each card's value definition, font sizes, currency formatting, the zero-value "-" display, or which card is selected for click-to-filter.
---

# Dashboard cards

The 6 stat cards (`StatCard`, defined in `dashboard-explorer.tsx`) are the
top section of the Dashboard, above the monthly breakdown table (see
`dashboard-monthly-table`) and the click-to-filter embedded transactions
table (see `dashboard-conventions`).

- **Grid**: `grid-cols-2 md:grid-cols-3`, DOM order Income, Expenses,
  Balance, Accounts, Transfers, Uncategorized — on `md:` widths that's row
  1 = Income/Expenses/Balance, row 2 = Accounts/Transfers/Uncategorized,
  per an explicit user requirement; don't reorder without re-checking that
  ask. There is no "Net" card — Balance replaced it (see below).
- **Font sizes**: value line (`CardContent`) is `text-base font-semibold`,
  title (`CardTitle`) is `text-sm font-normal text-muted-foreground`. The
  value used to be `text-xl`, sized down two Tailwind steps (`xl` → `lg` →
  `base`) per explicit user request — don't confuse this with the title,
  which was never touched.
- **Definitions, each computed once in `page.tsx` from `yearTransactions`
  and passed down as the `stats` prop** (a transaction is classified by
  its own category's `kind`, not by the sign of its amount — a transaction
  with no category at all belongs to Uncategorized instead of Income or
  Expenses, structurally similar to how `isTransfer` already works):
  - **Income** — sum of `amount` over transactions whose category `kind`
    is `"income"`.
  - **Expenses** — sum of `amount` (kept negative, not flipped) over
    transactions whose category `kind` is `"expense"`.
  - **Balance** — `incomeTotal + expensesTotal` (Expenses is already
    negative, so this nets the two rather than adding magnitudes) — this
    is the old "Net" card's formula, just renamed and recolored (see
    `amount-color-conventions`).
  - **Accounts** — sum of `accounts.current_balance` across every account
    — this is the *old* "Balance" card's value verbatim (the sum shown in
    the Accounts page's own Balance column), just renamed/repositioned.
    Don't confuse this with the new Balance card; they're unrelated
    numbers that happen to have swapped names across this change.
  - **Transfers** — sum of `Math.abs(amount)` over `isTransfer(t)`
    transactions (magnitude, not net, since transfers between a user's own
    accounts would otherwise tend to net toward zero).
  - **Uncategorized** — sum of `amount` (signed, not abs) over transactions
    with no `category_id` at all, regardless of sign.
- **`R$` is reserved for these 6 cards; nothing else on the Dashboard shows
  a currency symbol.** `dashboard-explorer.tsx`'s own `formatCurrency`
  (used only by `StatCard`) is the one Dashboard copy that keeps `style:
  "currency", currency: "BRL"` and 2 decimal places — don't copy this into
  a table's own `formatCurrency` (see `dashboard-monthly-table` and
  `dashboard-conventions` for the two plain-decimal copies, which
  intentionally differ from each other and from this one).
- **A card showing a zero value displays the literal string `"-"` instead
  of `formatCurrency(0)`** (which would otherwise read "R$ 0,00") — per
  explicit user request. The check is `value === 0 ? "-" : formatCurrency(value)`
  in `StatCard`'s `CardContent`; this doesn't touch `colorClassName` (a
  zero Balance still gets whatever color `balanceColor` computes, even
  though the "-" itself reads as plain text — don't special-case the color
  for a zero value, only the digits).
- **Click-to-filter**: clicking a card sets `selectedStat: StatKey |
  undefined` in `dashboard-explorer.tsx` (re-clicking the selected one
  clears it via `handleSelect`'s `prev === stat ? undefined : stat`
  check). This state, and the resulting `filteredTransactions` predicate
  per `StatKey`, are documented in `dashboard-conventions` alongside the
  embedded table they feed — see there for the exact filter logic per
  stat, since it's really a property of *that* table's data flow, not of
  the cards themselves.
