---
name: dashboard-conventions
description: Use when touching the Dashboard (src/app/page.tsx) — its stat cards, the "Income x Expenses x Transfers" monthly chart, the three category-breakdown bar charts (Expenses/Income/Transfer by category) and their sequential color scales, or the click-a-bar-to-filter embedded transactions table. Bespoke to this one page, not part of the shared table-page-conventions architecture (though the embedded table borrows heavily from it).
---

# Dashboard conventions

`src/app/page.tsx` is a year-scoped overview: 4 stat cards, a monthly
Income/Expenses/Transfers bar chart, three category-breakdown bar charts,
and a transactions table that only appears once a bar is clicked. No page
here shows a `(year)`/`— {year}` suffix in a card or chart title — the
page-level year nav (`← {year} {year+1} →` next to the `<h1>`) already
establishes it once.

- **`R$` is reserved for the 4 stat cards; nothing else on this page shows
  a currency symbol.** `page.tsx`'s own `formatCurrency` (used only by the
  Balance/Income/Expenses/Net cards) is the one Dashboard copy that keeps
  `style: "currency", currency: "BRL"`. `income-expenses-transfers-
  chart.tsx`'s and `category-bar-chart.tsx`'s `formatCurrency` (their
  tooltips and bar labels) and `dashboard-transactions-table.tsx`'s (its
  Amount column) all use the plain-decimal `Intl.NumberFormat("pt-BR", {
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
- **The monthly chart uses the flat colors, the category charts use the
  ramp.** `income-expenses-transfers-chart.tsx` (renamed from
  `budget-vs-actual-chart.tsx` — it no longer shows "planned" from
  `budget_items` at all, only actual income/expenses/transfers per month)
  is a 3-series grouped `BarChart`, one flat color per series. The three
  category cards use the shared `category-bar-chart.tsx` (renamed/
  generalized from `spending-by-category-chart.tsx`) — same horizontal
  `BarChart` shape for all three, parametrized by `data`/`selectedKey`/
  `onSelect` rather than three near-duplicate components.
- **Category aggregation always includes an `"uncategorized"` bucket for
  expenses and income, never for transfers.** `page.tsx` builds
  `expensesByCategory`/`incomeByCategory` in one pass over
  `nonTransferYearTransactions`, keyed by `category_id ?? "uncategorized"`
  (an expense/income transaction can genuinely lack a category).
  `transferByCategory` iterates the *unfiltered* `yearTransactions` for
  `isTransfer(t)` only — a transfer is defined as "has a category whose
  `kind` is `transfer`," so there's no uncategorized-transfer case
  structurally, and no bucket for it. Each chart entry's `key` is exactly
  this bucket key (`categoryId` or the literal string `"uncategorized"`) —
  that's also the string `CategoryBarChart`'s `onSelect`/`selectedKey` and
  `DashboardCategoryExplorer`'s filtering both key off.
- **Click-to-filter is single-selection, scoped to the 3 category charts
  only** (the monthly chart is a plain, non-interactive overview — it's
  grouped by month, a different dimension, and was deliberately left out
  of the filtering model). `dashboard-category-explorer.tsx` owns
  `selected: string | undefined` and passes it + a toggling `onSelect`
  (click the active bar again to clear) to all three `CategoryBarChart`s
  uniformly — a `categoryId` can only ever belong to one of the three
  datasets (a category has exactly one `kind`), so a single `selectedKey`
  naturally scopes to the right chart with no extra kind-tracking, and bars
  in the *other* two charts just never match (full opacity, unaffected).
  When nothing is selected, no table (not even an empty shell) renders —
  just a muted hint — per the "no bars selected → no table" requirement;
  when something is selected, the explorer filters the full year's
  `transactions` prop client-side and renders
  `dashboard-transactions-table.tsx` with the result.
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
  edit dialog's "Save and sync description" button and the
  `AddMappingDialog` handoff (see `transaction-description-rules`) had to
  be added to this file too, separately, when they were added to
  `transactions-table.tsx`. When touching one edit dialog, check whether
  the same change belongs in the other.
