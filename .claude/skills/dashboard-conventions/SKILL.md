---
name: dashboard-conventions
description: Use when touching the Dashboard's page-level structure (src/app/page.tsx, src/app/dashboard-explorer.tsx) or its embedded click-to-filter transactions table (dashboard-transactions-table.tsx) — the page wrapper width, the removed-charts history, the click-to-filter Selection/predicate logic, or the embedded table's own conventions. For the 6 stat cards themselves, see dashboard-cards; for the monthly breakdown tree table ("the dynamic table"), see dashboard-monthly-table.
---

# Dashboard conventions

`src/app/page.tsx` is a year-scoped overview: it's a thin server component
that fetches the year's data, computes every aggregate, and hands it all to
`dashboard-explorer.tsx` (`DashboardExplorer`, `"use client"`), which owns
the 6 stat cards (see `dashboard-cards`), the monthly breakdown tree table
(see `dashboard-monthly-table`), and the embedded transactions table
documented below, which only appears once a stat card is selected. No page
here shows a `(year)`/`— {year}` suffix in a card title — the page-level
year nav (`← {year} {year+1} →` next to the `<h1>`) already establishes it
once.

**The page wrapper is `max-w-6xl`** (`mx-auto flex w-full max-w-6xl
flex-col gap-6 p-6`), one step wider than the `max-w-5xl`
Transactions/Accounts use — bumped per explicit user request so the
embedded transactions table's columns (especially Amount) have more
breathing room and don't crowd together; the stat-card grid and monthly
breakdown table get the same extra width as a side effect, which is fine
since they're column-heavy too. If a future ask needs even more room for
one of these sections specifically without affecting the others, that's a
bigger change (breaking a section out of this centered container) — don't
reach for it unless asked; widening the whole page one more step is the
established, low-risk move here.

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

- **Click-to-filter is driven by a single `selectedStat: StatKey |
  undefined` in `dashboard-explorer.tsx`** — clicking a stat card (see
  `dashboard-cards`) toggles it (re-clicking the selected one clears it via
  `handleSelect`'s `prev === stat ? undefined : stat` check). When nothing
  is selected, no table (not even an empty shell) renders — just a muted
  hint; when something is selected, `DashboardExplorer` filters the full
  year's `transactions` prop client-side (see the `switch` in its
  `filteredTransactions` `useMemo` for each `StatKey`'s exact predicate)
  and renders `dashboard-transactions-table.tsx` with the result. The
  `"accounts"` stat has no natural transaction predicate of its own (an
  account balance isn't a property of a transaction) — clicking it shows
  every transaction for the year, on the reasoning that every transaction
  belongs to *some* account. (This used to be a richer `Selection` union
  also covering a monthly chart and a category-breakdown chart, both now
  deleted — see above — so it collapsed back down to just the stat-card
  case.)
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
- **`R$` is reserved for the 6 stat cards** (`dashboard-cards`); this
  table's own `formatCurrency` is plain-decimal, `minimumFractionDigits: 2,
  maximumFractionDigits: 2` — the same no-symbol style Transactions'/
  Accounts' own tables use (see `transactions-column-formatting`). This is
  **not** the same setting as the monthly breakdown table's own
  `formatCurrency` (`dashboard-monthly-table`, which rounds to 0 decimals)
  — the two were swapped by mistake once already because of a "dynamic
  table" naming mix-up; see that skill's naming note before touching
  either one's decimal formatting again.
- **The embedded table's row values are one Tailwind step smaller than
  every other table in the app: `<TableBody className="text-xs">`**,
  overriding the `text-sm` the shared `<Table>` root sets for every table
  (`src/components/ui/table.tsx`) — per explicit user request, scoped to
  just this one table rather than the shared component (which would have
  shrunk Transactions/Accounts/Categories/Classes/Descriptions too).
  Column headers are untouched (`<TableHeader>` isn't given `text-xs`, so
  `TableHead` cells still inherit the table-level `text-sm`) — only body
  row text shrank, since `text-xs` on `<TableBody>` only cascades to its
  own descendants. Don't confuse this with the monthly breakdown table's
  own `text-xs` cells, which live on plain `<td>`/`<th>` markup that never
  went through the shared `Table` component in the first place — see
  `dashboard-monthly-table`.
