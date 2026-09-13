---
name: dashboard-conventions
description: Use when touching the Dashboard (src/app/page.tsx, src/app/dashboard-explorer.tsx) — its 6 stat cards, the "Expenses by month" chart, the three category-breakdown bar charts (titled "Expenses"/"Income"/"Transfer", in an asymmetric 2-column grid) and their sequential color scales, or the click-a-card-or-bar-to-filter embedded transactions table. Bespoke to this one page, not part of the shared table-page-conventions architecture (though the embedded table borrows heavily from it).
---

# Dashboard conventions

`src/app/page.tsx` is a year-scoped overview: it's a thin server component
that fetches the year's data, computes every aggregate, and hands it all to
`dashboard-explorer.tsx` (`DashboardExplorer`, `"use client"`), which owns
the 6 stat cards, the "Expenses by month" chart, the three
category-breakdown bar charts, and the transactions table that only
appears once something is selected. No page here shows a `(year)`/
`— {year}` suffix in a card or chart title — the page-level year nav
(`← {year} {year+1} →` next to the `<h1>`) already establishes it once.
The three category-breakdown cards are titled just "Expenses"/"Income"/
"Transfer" (no "by category" suffix either — the `CategoryBarChart` inside
each one already makes clear it's a per-category breakdown).

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
    transactions (magnitude, not net — mirrors `transferByCategory`'s own
    `Math.abs` treatment, since transfers between a user's own accounts
    would otherwise tend to net toward zero).
  - **Uncategorized** — sum of `amount` (signed, not abs) over transactions
    with no `category_id` at all, regardless of sign.
- **The three category cards sit in an asymmetric 2-column grid, not 3
  equal columns**, in `dashboard-explorer.tsx`: `className="grid
  grid-cols-1 gap-4 md:grid-cols-2"` on the wrapping div, with the Expenses
  `Card` given `md:row-span-2` and no `items-start` on the grid (the
  default `stretch` is what makes Expenses' card background actually fill
  both rows — `items-start` would just top-align its own content instead
  and defeat the two-block look). DOM order is still Expenses, Income,
  Transfer — that alone is enough for CSS Grid's auto-placement to land
  Income top-right and Transfer bottom-right once Expenses claims column 1
  for both rows; no explicit `grid-column`/`grid-row` needed on the other
  two. If the three ever need to go back to equal-width columns, that's
  reverting to `grid-cols-1 items-start gap-4 md:grid-cols-3` and dropping
  the `row-span-2`, not adding more grid properties on top.
- **`expensesByCategory`/`incomeByCategory` (in `page.tsx`, feeding the two
  category-breakdown charts) still keep their own separate,
  sign-classified `"uncategorized"` bucket each** — this is deliberately
  *not* the same thing as the top-level Uncategorized stat card. The stat
  card is one number covering every categoryless transaction regardless of
  sign; the two chart buckets exist only so each breakdown chart can show
  "how much of this chart's total had no category," split by sign the same
  way the rest of that chart's buckets are. Don't try to unify them or feed
  the stat card from these maps.
- **`R$` is reserved for the 6 stat cards; nothing else on this page shows
  a currency symbol.** `dashboard-explorer.tsx`'s own `formatCurrency`
  (used only by `StatCard`) is the one Dashboard copy that keeps `style:
  "currency", currency: "BRL"`. `expenses-by-month-chart.tsx`'s and
  `category-bar-chart.tsx`'s `formatCurrency` (their tooltips and bar
  labels) and `dashboard-transactions-table.tsx`'s (its Amount column) all
  use the plain-decimal `Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2, maximumFractionDigits: 2 })` instead — the
  same no-symbol style Transactions'/Accounts' own tables use (see
  `transactions-column-formatting`). Don't copy the cards' currency-style
  `formatCurrency` into a new chart or into the embedded table.
- **Colors are never hand-picked — they trace back to the app's own
  existing tokens.** `src/lib/chart-colors.ts` exports `EXPENSE_HUE`/
  `INCOME_HUE`/`TRANSFER_HUE` (`{ h, c }` OKLCH hue+chroma pairs) and their
  flat single-color counterparts `EXPENSE_FLAT`/`INCOME_FLAT`/
  `TRANSFER_FLAT`, derived from `--destructive` (`globals.css`), Tailwind's
  built-in `emerald-600` (the same green `text-emerald-600` uses for
  positive amounts everywhere else — see `amount-color-conventions`), and
  `--muted-foreground`. Adding a fourth Dashboard color (or changing one of
  these three) means adding/editing a constant in `chart-colors.ts`, not
  typing a hex inline in a chart component.
- **`sequentialColor(hue, rank, count)`** (`src/lib/chart-colors.ts`) is
  the one-hue, monotone-lightness ramp used by all three category-breakdown
  charts: `rank` 0 (the highest-value bar, since data is sorted descending
  before coloring) gets the darkest step, the last rank gets the lightest,
  linearly interpolated between L 0.35 and 0.82 holding the hue's `h`/`c`
  fixed. A single-bar chart gets the darkest step. This is deliberately a
  *computed* ramp (per the `dataviz` skill's "compute it, don't eyeball
  it") rather than a hand-picked array of hexes — out-of-sRGB-gamut steps
  are gamut-mapped by the browser automatically, so the function never
  needs manual clamping. Don't run the `dataviz` skill's categorical
  palette validator against this ramp — it validates *categorical* (series
  identity) palettes, and a sequential ramp is expected to fail it by
  design (adjacent steps sit close on purpose).
- **The monthly chart is single-series now.** `expenses-by-month-chart.tsx`
  (renamed from `income-expenses-transfers-chart.tsx`, itself renamed from
  `budget-vs-actual-chart.tsx` — the Transfers bar was dropped first, then
  Income too, so it no longer shows anything but Expenses per month) is a
  single-series `BarChart` using `EXPENSE_FLAT`. Each month's `Bar` is
  wrapped in its own `Cell` (same per-bar opacity/`onClick` pattern
  `category-bar-chart.tsx` uses) so it participates in the click-to-filter
  model below — this is a change from the old "monthly chart is a plain,
  non-interactive overview" rule; that carve-out no longer applies now that
  there's only one series and clicking a month is a meaningful filter
  (that month's Expense-kind transactions). The three category cards use
  the shared `category-bar-chart.tsx` (renamed/generalized from
  `spending-by-category-chart.tsx`) — same horizontal `BarChart` shape for
  all three, parametrized by `data`/`selectedKey`/`onSelect` rather than
  three near-duplicate components.
- **Category aggregation always includes an `"uncategorized"` bucket for
  expenses and income, never for transfers.** `page.tsx` builds
  `expensesByCategory`/`incomeByCategory` in one pass over
  `nonTransferYearTransactions`, keyed by `category_id ?? "uncategorized"`
  (an expense/income transaction can genuinely lack a category).
  `transferByCategory` iterates the *unfiltered* `yearTransactions` for
  `isTransfer(t)` only — a transfer is defined as "has a category whose
  `kind` is `transfer`," so there's no uncategorized-transfer case
  structurally, and no bucket for it. Each chart entry's `key` is exactly
  this bucket key (`categoryId` or the literal string `"uncategorized"`).
- **Click-to-filter now spans stat cards, the monthly chart, and the 3
  category charts — all through one `Selection` union in
  `dashboard-explorer.tsx`**, not the old bare `selected: string`. The
  union is `{ kind: "stat"; stat: StatKey }` (the 6 cards) `| { kind:
  "category"; group: "expense" | "income" | "transfer"; key: string }`
  (the 3 breakdown charts) `| { kind: "month"; month: number }` (the
  monthly chart). The `group` tag on `"category"` exists specifically to
  disambiguate `"uncategorized"`, which is a legitimate key in *both* the
  Expenses and Income breakdown datasets — without it, selecting
  "uncategorized" in one chart could accidentally match the other's bucket
  of the same key. Each `CategoryBarChart`'s `selectedKey` is computed by
  checking `selection.kind === "category" && selection.group === "<its
  own group>"` before reading `selection.key`, so a selection from a
  different chart (or a different kind entirely) never bleeds into it — no
  extra cross-chart bookkeeping needed since a `categoryId` still only
  ever belongs to one group. `selectionId()` serializes a `Selection` to a
  string purely so `handleSelect` can toggle off a re-click of the same
  thing; don't compare `Selection` objects with `===`. When nothing is
  selected, no table (not even an empty shell) renders — just a muted
  hint; when something is selected, `DashboardExplorer` filters the full
  year's `transactions` prop client-side (see the `switch` in its
  `filteredTransactions` `useMemo` for each kind's exact predicate) and
  renders `dashboard-transactions-table.tsx` with the result. The
  `"accounts"` stat has no natural transaction predicate of its own (an
  account balance isn't a property of a transaction) — clicking it shows
  every transaction for the year, on the reasoning that every transaction
  belongs to *some* account.
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
