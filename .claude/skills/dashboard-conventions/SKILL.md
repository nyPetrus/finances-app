---
name: dashboard-conventions
description: Use when touching the Dashboard (src/app/page.tsx, src/app/dashboard-explorer.tsx, src/app/dashboard-monthly-breakdown.ts, src/app/dashboard-monthly-table.tsx) — its 6 stat cards, the Type/Category/Class monthly breakdown tree table, or the click-a-card-to-filter embedded transactions table. Bespoke to this one page, not part of the shared table-page-conventions architecture (though the embedded table borrows heavily from it).
---

# Dashboard conventions

`src/app/page.tsx` is a year-scoped overview: it's a thin server component
that fetches the year's data, computes every aggregate, and hands it all to
`dashboard-explorer.tsx` (`DashboardExplorer`, `"use client"`), which owns
the 6 stat cards, the monthly breakdown tree table, and the transactions
table that only appears once a stat card is selected. No page here shows a
`(year)`/`— {year}` suffix in a card title — the page-level year nav
(`← {year} {year+1} →` next to the `<h1>`) already establishes it once.
**There used to be Income/Expenses/Transfer category-breakdown bar charts
and a monthly bar chart here — all were removed per explicit user
request** (the last of them in the commit titled "Remove Expenses-by-month
and Expenses (category breakdown) charts from Dashboard"); don't
reintroduce any of them without a fresh ask, and see git history for
`expenses-by-month-chart.tsx`/`category-bar-chart.tsx` (both deleted) if
they ever need to come back. `src/lib/chart-colors.ts` (`EXPENSE_HUE`/
`INCOME_HUE`/`TRANSFER_HUE`, their `_FLAT` counterparts, `sequentialColor`)
is now unused anywhere in the app as a result — still intentionally kept
rather than deleted, as an already-derived set of design tokens to reach
for first if a chart ever returns.

- **The 6 stat cards sit in a `grid-cols-2 md:grid-cols-3` grid, DOM order
  Income, Expenses, Balance, Accounts, Transfers, Uncategorized** — on
  `md:` widths that's row 1 = Income/Expenses/Balance, row 2 =
  Accounts/Transfers/Uncategorized, per an explicit user requirement; don't
  reorder without re-checking that ask. There is no "Net" card — Balance
  replaced it (see below). **Definitions, each computed once in `page.tsx`
  from `yearTransactions` and passed down as the `stats` prop** (a
  transaction is classified by its own category's `kind`, not by the sign
  of its amount — a transaction with no category at all belongs to
  Uncategorized instead of Income or Expenses, structurally similar to how
  `isTransfer` already worked):
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
- **`R$` is reserved for the 6 stat cards; nothing else on this page shows
  a currency symbol.** `dashboard-explorer.tsx`'s own `formatCurrency`
  (used only by `StatCard`) is the one Dashboard copy that keeps `style:
  "currency", currency: "BRL"`. `dashboard-monthly-table.tsx`'s and
  `dashboard-transactions-table.tsx`'s own `formatCurrency` copies (the
  breakdown table's cells, the embedded table's Amount column) use the
  plain-decimal `Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2,
  maximumFractionDigits: 2 })` instead — the same no-symbol style
  Transactions'/Accounts' own tables use (see
  `transactions-column-formatting`). Don't copy the cards' currency-style
  `formatCurrency` into a new addition here.
- **The monthly breakdown table (`dashboard-monthly-breakdown.ts` +
  `dashboard-monthly-table.tsx`) sits directly below the stat-card grid,
  above the click-to-filter embedded table.** It's a 3-level expand/collapse
  tree — Type (Income/Expenses/Transfers, always shown, plus Uncategorized
  only when at least one transaction actually has no category) → Category
  (only categories of that `kind` with at least one transaction this year)
  → Class (only classes with at least one transaction this year) — with a
  month column per month plus a trailing Total column (year sum of that
  row). `buildMonthlyBreakdown()` is a pure function (no `"use client"`,
  called from `page.tsx`) that does a single pass over `yearTransactions`
  bucketing into per-type/per-category/per-class month arrays, then builds
  the `MonthlyRow[]` tree from `categories`/`classes` filtered down to only
  the ids that pass had at least one transaction — a category or class with
  zero transactions this year gets no row at all, so expanding "+" never
  reveals an empty list. **A Category row's months come directly from
  transactions in that category, not from summing its Class children** —
  a category can have transactions with no `class_id`, so a category's
  total can legitimately exceed the sum of its visible Class rows; this is
  intentional, not a bug to "fix" by adding a synthetic "no class" row.
  Transfer-kind rows (Type/Category/Class alike) sum `Math.abs(amount)`,
  matching the Transfers stat card's own magnitude-not-net rule; every
  other kind sums the signed `amount` as-is.
  - **Row color is inherited down from the Type ancestor, not computed
    per-row.** `dashboard-monthly-table.tsx`'s `TYPE_COLOR` map gives
    `"type:income"` unconditional `text-emerald-600` and `"type:expense"`
    unconditional `text-destructive` (mirroring those two stat cards'
    own colors — Expenses being unconditionally red here is the same
    documented Dashboard exception to the Transactions-table "only
    positive gets color" rule, see `amount-color-conventions`);
    `"type:transfer"`/`"type:uncategorized"` get no color (`undefined`,
    plain foreground, matching those stat cards). Every Category/Class row
    under a Type just inherits that Type's color via a prop threaded
    through the recursion — don't give Category/Class rows their own color
    logic.
  - **Expand state defaults to fully collapsed** (`useState<Set<string>>(new
    Set())` in `MonthlyBreakdownTable`) — only the 3-4 Type rows are
    visible on first render; a row only shows a "+"/"−" toggle
    (`PlusIcon`/`MinusIcon`, not `ChevronRight`/`SortableTableHead`'s sort
    arrows) when it actually has children, and Class rows never do (this is
    the bottom of the hierarchy — "I can see at maximum at class level" was
    an explicit requirement, don't add a 4th level).
  - **This table is plain `<table>`/`table-fixed`/`<colgroup>` markup
    (mirroring `budget/yearly-grid.tsx`'s month-grid, not shadcn's
    `Table`/`SortableTableHead`/`table-page-conventions`'s `auto`-layout
    rule)** — the column set here (label + 12 fixed months + Total) is
    static and never hidden/reordered, so the reasoning behind
    `table-page-conventions`'s "no `table-fixed`" rule (columns can be
    hidden/reordered at runtime) doesn't apply. Don't route this through
    `ColumnsMenu`/`useColumnPreferences`.
  - **Deliberately not wired into the stat cards' click-to-filter
    `Selection` state below** — clicking a row's "+" only expands/collapses
    it locally; it doesn't select anything or affect
    `DashboardTransactionsTable`. Adding that wiring is a reasonable future
    ask, not something to assume is already half-done.
- **Click-to-filter is driven by a single `selectedStat: StatKey |
  undefined` in `dashboard-explorer.tsx`** — clicking a stat card toggles
  it (re-clicking the selected one clears it via `handleSelect`'s `prev ===
  stat ? undefined : stat` check). When nothing is selected, no table (not
  even an empty shell) renders — just a muted hint; when something is
  selected, `DashboardExplorer` filters the full year's `transactions` prop
  client-side (see the `switch` in its `filteredTransactions` `useMemo` for
  each `StatKey`'s exact predicate) and renders
  `dashboard-transactions-table.tsx` with the result. The `"accounts"` stat
  has no natural transaction predicate of its own (an account balance isn't
  a property of a transaction) — clicking it shows every transaction for
  the year, on the reasoning that every transaction belongs to *some*
  account. (This used to be a richer `Selection` union also covering a
  monthly chart and a category-breakdown chart, both now deleted — see
  above — so it collapsed back down to just the stat-card case.)
- **The embedded table is a separate component from `TransactionsTable`,
  not a reuse — deliberately.** `TransactionsTable`'s sort links to
  `/transactions?month=...&sort=...`, which would navigate away from the
  filtered Dashboard view (and land on an unfiltered, differently-scoped
  page) on every sort click. `dashboard-transactions-table.tsx` copies
  `TransactionsTable`'s structure (same `COLUMNS`, same `RowActionsMenu`/
  `ColumnsMenu`/`useRowSelection`/`useColumnPreferences` — own
  `storageKey`: `"dashboard-transactions-table"` — same edit dialog, same
  two-zone toolbar, same server actions from `transactions/actions.ts` and
  `transactions/add-transaction-dialog.tsx`, all already generic) but sorts
  via local `useState<{key,dir}>` and `SortableTableHead`'s `onSort` prop
  instead of `href` — see `table-page-conventions`'s "Sorting" bullet for
  the `onSort`/`href` split. It takes an already-filtered `transactions`
  array as a prop; the explorer does the filtering, this component only
  renders and sorts it. **Being a copy, not a shared component, means a
  `TransactionsTable` feature doesn't automatically show up here** — the
  edit dialog's "Save and map description" button and the
  `AddMappingDialog` handoff (see `transaction-description-rules`) had to
  be added to this file too, separately, when they were added to
  `transactions-table.tsx`. When touching one edit dialog, check whether
  the same change belongs in the other.
