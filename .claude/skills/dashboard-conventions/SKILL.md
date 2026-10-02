---
name: dashboard-conventions
description: Use when touching the Dashboard's page-level structure (src/app/page.tsx, src/app/dashboard-explorer.tsx) or its embedded click-to-filter transactions table (dashboard-transactions-table.tsx) — the page wrapper width, the removed-charts/removed-cards history, the click-to-filter MonthlySelection/predicate logic, or the embedded table's own conventions. For the monthly breakdown tree table ("the dynamic table") that now drives all of the above, see dashboard-monthly-table.
---

# Dashboard conventions

`src/app/page.tsx` is a year-scoped overview: it's a thin server component
that fetches the year's data and hands it to `dashboard-explorer.tsx`
(`DashboardExplorer`, `"use client"`), which owns the monthly breakdown tree
table (see `dashboard-monthly-table`) and the embedded transactions table
documented below, which only appears once a cell in that tree table is
selected. No page here shows a `(year)`/`— {year}` suffix in a heading —
the page-level year nav (`< {year} >` next to the `<h1>`) already
establishes it once. The prev/next buttons show only `<`/`>` — no adjacent
year number, per explicit user request (the target year lives in each
button's `aria-label` instead). Budget's year nav still shows the numbers.

**The page wrapper is `max-w-6xl`** (`mx-auto flex w-full max-w-6xl
flex-col gap-6 p-6`), one step wider than the `max-w-5xl`
Transactions/Accounts use. If a future ask needs even more room for one of
this page's sections specifically without affecting the other, that's a
bigger change (breaking a section out of this centered container) — don't
reach for it unless asked; widening the whole page one more step is the
established, low-risk move here.
**Why:** bumped per explicit user request so the embedded transactions
table's columns (especially Amount) have more breathing room and don't
crowd together; the monthly breakdown table gets the same extra width as
a side effect, which is fine since it's column-heavy too.

**There are no charts on the Dashboard, and `src/lib/chart-colors.ts`
(`EXPENSE_HUE`/`INCOME_HUE`/`TRANSFER_HUE`, their `_FLAT` counterparts,
`sequentialColor`) is unused anywhere in the app as a result** — still
intentionally kept rather than deleted, as an already-derived set of
design tokens to reach for first if a chart ever returns.
**Why:** there used to be Income/Expenses/Transfer category-breakdown bar
charts and a monthly bar chart here — all were removed per explicit user
request (the last of them in the commit titled "Remove Expenses-by-month
and Expenses (category breakdown) charts from Dashboard"); don't
reintroduce any of them without a fresh ask, and see git history for
`expenses-by-month-chart.tsx`/`category-bar-chart.tsx` (both deleted) if
they ever need to come back.

**There are no stat cards on the Dashboard any more** — `StatCard`, the
`StatKey` type, and the `stats: Record<StatKey, number>` prop `page.tsx`
used to compute and pass down (`incomeTotal`/`expensesTotal`/
`balanceTotal`/`accountsTotal`/`transfersTotal`/`uncategorizedTotal` and
their `categoriesById`/`isTransfer` helpers) are all gone from `page.tsx`
too — don't reintroduce them speculatively for a future feature, recompute
from `yearTransactions` when actually needed. There used to be a dedicated
`dashboard-cards` skill covering these — it's deleted now that there's no
card code left to document; if the cards ever come back, recreate it
rather than assuming its old content is still accurate.
**Why:** removed per explicit user request once the monthly breakdown
table's Type rows (plus its click-to-filter, see below) covered the same
information. `amount-color-conventions` still has some now-historical
detail about the cards' color rules worth skimming if the cards ever come
back.

- **Click-to-filter is driven by a single `selection: MonthlySelection |
  undefined` in `dashboard-explorer.tsx`**, entirely owned by the monthly
  breakdown table (see `dashboard-monthly-table` for exactly what counts
  as a click and how `MonthlySelection` is shaped) — clicking toggles it
  (re-clicking the exact same selection clears it via `handleSelect`'s
  `monthlySelectionsEqual` check). When nothing is selected, nothing
  renders below the monthly breakdown table at all — no table, no hint
  text either. When something is selected, `DashboardExplorer` filters the
  full year's `transactions` prop client-side (see the
  `filteredTransactions` `useMemo`) and renders
  `dashboard-transactions-table.tsx` with the result.
  **Why:** now entirely owned by the monthly breakdown table because the
  stat cards are gone (this selection used to be a `{source: "stat"} |
  {source: "monthly"}` union covering both the stat cards and this table
  — collapsed back down to just the monthly case once the cards were
  removed, the same way it once collapsed down from an even richer union
  that also covered two now-deleted charts). The "Click a cell..." muted
  hint text that used to sit here was removed per explicit user request —
  don't re-add it without a fresh ask.
- **On phones the filtered transactions open in a bottom sheet** instead
  of inline below the tree (where they'd land off-screen): a `Dialog` whose
  `DialogContent` is restyled to `bottom-0 … rounded-t-xl max-h-[85dvh]`.
  Its title is `SelectionLabel` — the selection in the dynamic table's own
  symbols (type arrow, padlock, category/class icon, names as tooltips)
  plus the month or "Year" — with "N transactions · total" under it
  (signed sum, emerald only when ≥ 0, like Search's summary). Closing the
  sheet clears the selection. Inside, the embedded table renders its
  shared `TransactionCardList` (tap a card to edit) below `sm`. Per
  explicit user request.
- **The embedded table is a separate component from `SearchTable`
  (`search/search-table.tsx`, the main transaction table since the old
  Transactions page and its `TransactionsTable` were removed), not a
  reuse — deliberately.** `dashboard-transactions-table.tsx` copies
  `SearchTable`'s structure (same `COLUMNS`, same `RowActionsMenu`/
  `ColumnsMenu`/`useRowSelection`/`useColumnPreferences` — own
  `storageKey`: `"dashboard-transactions-table"` — same edit dialog, same
  two-zone toolbar, same server actions from `transactions/actions.ts` and
  `transactions/add-transaction-dialog.tsx`, all already generic) but sorts
  via local `useState<{key,dir}>` and `SortableTableHead`'s `onSort` prop
  instead of `href` — see `table-page-conventions`'s "Sorting" bullet for
  the `onSort`/`href` split. It takes an already-filtered `transactions`
  array as a prop; the explorer does the filtering, this component only
  renders and sorts it. **Being a copy, not a shared component, means a
  `SearchTable` feature doesn't automatically show up here** — the
  edit dialog's "Save and map description" button and the
  `AddMappingDialog` handoff (see `transaction-description-rules`) had to
  be added to this file too, separately. When touching one edit dialog,
  check whether the same change belongs in the other.
  **Why:** `SearchTable`'s sort links to `/search?...&sort=...`, which
  would navigate away from the filtered Dashboard view on every sort
  click — a plain reuse wasn't viable.
- **Nothing on the Dashboard shows a `R$` currency symbol any more.**
  This table's own `formatCurrency` is plain-decimal,
  `minimumFractionDigits: 2, maximumFractionDigits: 2` — the same
  no-symbol style Transactions'/Accounts' own tables use (see
  `transactions-column-formatting`). This is **not** the same setting as
  the monthly breakdown table's own `formatCurrency` (`dashboard-monthly-table`,
  which rounds to 0 decimals) — the two were swapped by mistake once
  already because of a "dynamic table" naming mix-up; see that skill's
  naming note before touching either one's decimal formatting again.
  **Why:** `R$` used to be reserved for the now-removed stat cards
  specifically (see above).
- **The embedded table's row values are one Tailwind step smaller than
  every other table in the app: `<TableBody className="text-xs">`**,
  overriding the `text-sm` the shared `<Table>` root sets for every table
  (`src/components/ui/table.tsx`). Column headers are untouched
  (`<TableHeader>` isn't given `text-xs`, so `TableHead` cells still
  inherit the table-level `text-sm`) — only body row text shrank, since
  `text-xs` on `<TableBody>` only cascades to its own descendants. Don't
  confuse this with the monthly breakdown table's own `text-xs` cells,
  which live on plain `<td>`/`<th>` markup that never went through the
  shared `Table` component in the first place — see `dashboard-monthly-table`.
  **Why:** per explicit user request, scoped to just this one table rather
  than the shared component (which would have shrunk
  Transactions/Accounts/Categories/Classes/Descriptions too).
