---
name: dashboard-monthly-table
description: Use when touching the Dashboard's monthly breakdown tree table (dashboard-monthly-breakdown.ts + dashboard-monthly-table.tsx) — what the user calls "the dynamic table," since its rows dynamically expand/collapse (not the embedded click-to-filter transactions table, which only appears/disappears wholesale — see dashboard-conventions for that one). Covers the Type/Category/Class tree, the footer Total row, column auto-sizing, decimal rounding, zero-value empty cells, row color, and the expand/collapse chevrons.
---

# Dashboard monthly table ("the dynamic table")

`dashboard-monthly-breakdown.ts` (`buildMonthlyBreakdown()`, a pure
function, no `"use client"`, called from `page.tsx`) + `dashboard-monthly-
table.tsx` (`MonthlyBreakdownTable`, `"use client"`) together render the
Type/Category/Class monthly breakdown, sitting directly below the page's
year-nav header and above the click-to-filter embedded table (see
`dashboard-conventions`) — there used to be a 6-card stat grid between the
two, removed once this table's own Type rows and click-to-filter covered
the same ground; see `dashboard-conventions`'s "removed-cards" history if
that ever needs revisiting.

**Naming note**: the user refers to this specific table as "the dynamic
table" (its rows dynamically expand/collapse). This is a real,
previously-confused naming point — don't assume "dynamic table" in a
future request means the embedded click-to-filter transactions table,
which is a different component with its own conventions
(`dashboard-conventions`). A past turn swapped a decimal-formatting change
between the two tables because of exactly this ambiguity; confirm which
table is meant if it's ever unclear again.

- **3-level expand/collapse tree**: Type (Income/Expenses/Transfers,
  always shown, plus Uncategorized only when at least one transaction
  actually has no category) → Category (only categories of that `kind`
  with at least one transaction this year) → Class (only classes with at
  least one transaction this year) — with a month column per month plus a
  trailing Total column (year sum of that row). `buildMonthlyBreakdown()`
  does a single pass over `yearTransactions` bucketing into per-type/
  per-category/per-class month arrays, then builds the `MonthlyRow[]` tree
  from `categories`/`classes` filtered down to only the ids that had at
  least one transaction — a category or class with zero transactions this
  year gets no row at all, so expanding a row never reveals an empty list.
  **A Category row's months come directly from transactions in that
  category, not from summing its Class children** — a category can have
  transactions with no `class_id`, so a category's total can legitimately
  exceed the sum of its visible Class rows; this is intentional, not a bug
  to "fix" by adding a synthetic "no class" row. **Every kind, including
  Transfer, sums the signed `amount` as-is** — a 150 transfer out and a
  150 transfer in nets to 0 here, per explicit user request. (The
  now-removed Transfers stat card used to sum `Math.abs(amount)`
  — magnitude, not net — so its own two legs wouldn't cancel out; this
  table was a deliberate divergence from that even before the card was
  deleted, see `dashboard-conventions`'s "removed-cards" history.)
- **A footer `<tfoot>` "Total" row sums straight down each month column,
  plus a grand-total cell in the Total column** — per explicit user
  request, symmetric with each row's own Total *column* (row-wise sum).
  `MonthlyBreakdownTable` computes this itself from the top-level `rows`
  prop only (`monthTotals`, one pass summing `row.months[i]` across every
  Type row; `grandTotal` is `monthTotals`'s own sum) — **not** from
  `TreeRows`, and **not** including Category/Class rows, since those are
  already folded into their parent Type row's `months`/`total` and would
  double-count if summed again. Styled `border-t font-medium` — just a
  rule, no background — to read as a spreadsheet-style footer; the header
  row is the same (`border-b`, no background, no top border, top of the
  table). Both used to have a `bg-muted` tint (and the Total column a
  darker one still) to make them stand out further, but that was removed
  per explicit user request — don't reintroduce a background on either row
  without a fresh ask. This total is a plain arithmetic column-sum of
  signed amounts (Transfers included, see above), not a "Balance"-style
  figure — the now-removed Balance stat card deliberately excluded
  Transfers entirely rather than netting them in, so don't treat this
  total as a like-for-like replacement for it.
- **Values round to whole numbers, no decimals**:
  `dashboard-monthly-table.tsx`'s own `formatCurrency` uses
  `minimumFractionDigits: 0, maximumFractionDigits: 0` — per explicit user
  request, and specific to this table (the embedded transactions table
  keeps 2 decimals; see the naming note above for why this matters to get
  right).
- **A cell whose value is exactly `0` renders empty, not `"0"`** — per
  explicit user request. Both the month cells and the trailing Total cell
  check `value === 0` (`row.total === 0` for the Total cell) and render an
  empty string instead of calling `formatCurrency`. This applies uniformly
  to every row (Type, Category, and Class alike) — don't special-case any
  one level to still show "0". The footer Total row's own cells follow the
  same rule (`monthTotals[i] === 0` / `grandTotal === 0`).
- **Type and Category rows show only their icon/symbol, not their text
  name** — per explicit user request. A Type row's `row.symbol` (the
  up/down/transfer arrow from `TRANSACTION_TYPE_SYMBOLS`) and a Category
  row's `row.icon` (`category.icon`, rendered via `CategoryIcon`) are
  enough on their own; the label `<span>` in `TreeRows` only renders when
  `hasIcon` (`!!row.icon || !!row.symbol`) is false, or at the Class level
  (`isClassLevel`), since Class rows never carry an icon and would
  otherwise go blank. The "Uncategorized" Type row has neither an icon nor
  a symbol, so it falls into that same `!hasIcon` fallback and keeps its
  text label — don't treat that as an inconsistency to "fix" by giving it
  a synthetic icon. The full name is still available as a native `title`
  tooltip on the row's icon-containing wrapper `<div>` so it isn't lost
  entirely, just hidden from the default view.
- **`MONTH_LABELS` (the column headers) is a plain lowercase array
  (`["jan", "fev", ..., "dez"]`), not `Intl.DateTimeFormat("pt-BR", {
  month: "short" })`** — the `Intl` short form renders with a trailing
  period ("jan.", "fev.", ...) in pt-BR, which showed up as dots on every
  month column header; a plain array sidesteps that entirely and matches
  the same `MONTH_ABBREVIATIONS` array `transactions-table.tsx`/
  `dashboard-transactions-table.tsx` already use for their Date column.
  The `<th>` still has `className="... capitalize"` so headers display
  "Jan", "Fev", etc. despite the array being lowercase — don't capitalize
  the array itself, that would just double up with the CSS.
- **Row color is inherited down from the Type ancestor, not computed
  per-row.** The `TYPE_COLOR` map gives `"type:income"` unconditional
  `text-emerald-600` and `"type:expense"` unconditional `text-destructive`
  (Expenses being unconditionally red here is the same documented
  Dashboard exception to the Transactions-table "only positive gets color"
  rule, see `amount-color-conventions` — originally chosen to mirror the
  now-removed Income/Expenses stat cards' own colors, but this table keeps
  the rule on its own merits now that those cards are gone);
  `"type:transfer"`/`"type:uncategorized"` get no color (`undefined`, plain
  foreground). Every Category/Class row under a Type just inherits that
  Type's color via a prop threaded through the recursion — don't give
  Category/Class rows their own color logic.
- **Expand state defaults to fully collapsed** (`useState<Set<string>>(new
  Set())` in `MonthlyBreakdownTable`) — only the 3-4 Type rows are visible
  on first render; a row only shows a toggle button when it actually has
  children, and Class rows never do (this is the bottom of the hierarchy
  — "I can see at maximum at class level" was an explicit requirement,
  don't add a 4th level). **The toggle is `ChevronRightIcon`/
  `ChevronDownIcon` (collapsed/expanded)** — it used to be `PlusIcon`/
  `MinusIcon`, deliberately *not* chevrons (to avoid visual confusion with
  `SortableTableHead`'s own chevron-based sort arrows elsewhere in the
  app), but that was reversed per explicit user request. If sort-arrow
  confusion ever comes up again as a real complaint, that's the tradeoff
  being made here — don't silently revert to Plus/Minus without checking
  with the user first, since it was an explicit ask both times.
- **This table is plain `<table>` markup, `table-layout: auto` (no
  `table-fixed`, no `<colgroup>`) per explicit user request** — columns
  size to their own content instead of a fixed 16%/6%×12/12% split, so a
  long Category/Class label (or a month with an unusually wide number)
  can make its column wider, shrinking the others in response; the user
  explicitly accepted that columns shift as rows expand/collapse in
  exchange for numbers/labels fitting tightly instead of floating in
  fixed-width cells. The label cell still caps growth at `max-w-56
  truncate` (on the `<td>` itself, not just the inner `span` — see
  `table-page-conventions`'s `truncate`+`max-w-*` rule, which applies here
  too even though this table doesn't use shadcn's `Table`) so one very
  long label can't crush the 12 month columns down to nothing; the
  month/Total cells stay `whitespace-nowrap` so their own natural
  (numeric) content width is what auto-layout sizes them to — now further
  narrowed whenever a cell is empty (see the zero-value rule above), which
  is fine and expected. The column set here (label + 12 months + Total) is
  still static and never hidden/reordered — don't route this through
  `ColumnsMenu`/`useColumnPreferences`, that's unrelated to why it dropped
  `table-fixed`.
- **Drives the embedded transactions table's click-to-filter entirely on
  its own** — this table used to be deliberately unwired from a separate
  stat-card click-to-filter, then got wired in alongside the cards, then
  became the sole driver once the cards were removed (see
  `dashboard-conventions`'s "removed-cards" history); check git history
  before assuming either the disconnection or the card-sharing still
  applies. `dashboard-explorer.tsx` holds a single `selection:
  MonthlySelection | undefined`, passed to this table as `selected` and
  updated via its `onSelect` prop. Every `MonthlyRow` carries its own
  `kind`/`categoryId`/`classId` (not just its display `key`) so a click
  handler doesn't need to re-derive them. Clicking a row's label or its
  Total cell filters to that row's whole year; clicking one of its month
  cells scopes it to that month too; clicking a month header/footer cell
  filters to that month across every type (`kind` left `undefined` in the
  `MonthlySelection`); clicking the Total header/footer cell shows the
  full year unrestricted — the same "everything" case the now-removed
  "Accounts" stat card used to cover. Re-clicking the exact same selection
  clears it (`monthlySelectionsEqual` in `dashboard-explorer.tsx`). The
  clicked cell/row/column gets a `ring-2 ring-inset ring-primary`
  highlight (`SELECTED_CELL` in `dashboard-monthly-table.tsx`) — the
  expand/collapse chevron button calls `stopPropagation` so toggling a row
  no longer also changes the filter.
