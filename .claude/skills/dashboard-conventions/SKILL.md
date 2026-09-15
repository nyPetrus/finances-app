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

- **`StatCard`'s value line is `text-base` (`CardContent`), its title is
  `text-sm` (`CardTitle`)** — the value used to be `text-xl`, sized down
  two Tailwind steps (`xl` → `lg` → `base`) per explicit user request.
  Don't confuse this with the title, which was never touched and stays a
  fixed `text-sm text-muted-foreground` regardless of what the value size
  does.
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
  - **`MONTH_LABELS` (`dashboard-monthly-table.tsx`, the column headers) is
    a plain lowercase array (`["jan", "fev", ..., "dez"]`), not
    `Intl.DateTimeFormat("pt-BR", { month: "short" })`** — the `Intl`
    short form renders with a trailing period ("jan.", "fev.", ...) in
    pt-BR, which showed up as dots on every month column header; a plain
    array sidesteps that entirely and matches the same
    `MONTH_ABBREVIATIONS` array `transactions-table.tsx`/
    `dashboard-transactions-table.tsx` already use for their Date column.
    The `<th>` still has `className="... capitalize"` so headers display
    "Jan", "Fev", etc. despite the array being lowercase — don't
    capitalize the array itself, that would just double up with the CSS.
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
  - **This table is plain `<table>` markup, `table-layout: auto` (no
    `table-fixed`, no `<colgroup>`) per explicit user request** — columns
    size to their own content instead of a fixed 16%/6%×12/12% split, so
    a long Category/Class label (or a month with an unusually wide number)
    can make its column wider, shrinking the others in response; the user
    explicitly accepted that columns shift as rows expand/collapse in
    exchange for numbers/labels fitting tightly instead of floating in
    fixed-width cells. The label cell still caps growth at `max-w-56
    truncate` (on the `<td>` itself, not just the inner `span` — see
    `table-page-conventions`'s `truncate`+`max-w-*` rule, which applies
    here too even though this table doesn't use shadcn's `Table`) so one
    very long label can't crush the 12 month columns down to nothing; the
    month/Total cells stay `whitespace-nowrap` so their own natural
    (numeric) content width is what auto-layout sizes them to. Despite the
    styling difference from `table-page-conventions`'s `auto`-layout rule
    for shadcn tables (no `<colgroup>`/fixed widths there either, for a
    different reason — columns can be hidden/reordered at runtime), the
    *outcome* is now consistent between the two: neither table hand-fixes
    column widths any more. The column set here (label + 12 months +
    Total) is still static and never hidden/reordered — don't route this
    through `ColumnsMenu`/`useColumnPreferences`, that's unrelated to why
    it dropped `table-fixed`.
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
  own `text-xs` cells above — those were already `text-xs` independently,
  on plain `<td>`/`<th>` markup that never went through the shared `Table`
  component in the first place.
