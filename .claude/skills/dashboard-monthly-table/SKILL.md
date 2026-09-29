---
name: dashboard-monthly-table
description: Use when touching the Dashboard's monthly breakdown tree table (dashboard-monthly-breakdown.ts + dashboard-monthly-table.tsx) — what the user calls "the dynamic table," since its rows dynamically expand/collapse (not the embedded click-to-filter transactions table, which only appears/disappears wholesale — see dashboard-conventions for that one). Covers the Type level (static) plus the configurable Autonomy/Category/Class levels (the "Levels" menu — include/exclude and reorder), the footer Total row, column auto-sizing, decimal rounding, zero-value empty cells, row color, the click-the-label expand/collapse (no separate toggle button/icon, and the label no longer drives click-to-filter — only the month/Total cells do), and the sticky/frozen header row, footer row, label column, and Total column.
---

# Dashboard monthly table ("the dynamic table")

`dashboard-monthly-breakdown.ts` (`buildMonthlyBreakdown()`, a pure
function, no `"use client"`) + `dashboard-monthly-table.tsx`
(`MonthlyBreakdownTable`, `"use client"`) together render the Type +
configurable-levels monthly breakdown, sitting directly below the page's
year-nav header and above the click-to-filter embedded table (see
`dashboard-conventions`).
**Why no stat cards between them:** there used to be a 6-card stat grid
here, removed once this table's own Type rows and click-to-filter covered
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

- **The levels below Type are configurable.** A "Levels" icon-button menu
  (top-right of `dashboard-explorer.tsx`, reusing `ColumnsMenu`/
  `useColumnPreferences` — the same show/hide + up/down-reorder control
  the rest of the app uses for table columns, storage key
  `dashboard-monthly-table-levels`) lets the user include/exclude and
  reorder `ClassificationLevel`s (`"autonomy" | "category" | "class"`)
  freely. **Type is never one of these** — it's hardcoded as the
  always-present root level (Income/Expenses/Transfers, plus Uncategorized
  when applicable) and isn't listed in the menu.
  `buildMonthlyBreakdown(transactions, categories, classes, levels)` takes
  the resulting ordered subset (default `DEFAULT_CLASSIFICATION_LEVELS =
  ["autonomy", "category", "class"]`, the original fixed order) and
  recurses through it via `buildLevelRows` — moving Class above Category
  (or excluding Category/Autonomy entirely) is just a different `levels`
  array, not a special case in the tree-building code. Because the level
  config is a per-browser preference, `buildMonthlyBreakdown` runs
  **client-side inside `dashboard-explorer.tsx`** (not server-side in
  `page.tsx` — `page.tsx` just passes raw `transactions`/`categories`/
  `classes` through). Every `MonthlyRow` carries a `level: "type" |
  ClassificationLevel` field set at build time; `dashboard-monthly-table.tsx`
  uses that (not a hardcoded depth number) to decide Autonomy/Class-specific
  styling, since which depth holds which classification now depends on the
  configured order.
  **Why:** added per explicit user request.

- **Up-to-4-level expand/collapse tree**: Type (Income/Expenses/Transfers,
  always shown, plus Uncategorized only when at least one transaction
  actually has no category — Uncategorized has no children) is the static
  root, then zero to three more levels per the user's "Levels" menu
  selection/order — **Autonomy** (Baixa / Alta, always in that order
  regardless of where the level sits), **Category** (only categories of
  that `kind` with at least one transaction this year under whatever
  ancestor levels are above it), and **Class** (only classes with at least
  one transaction this year), each only appearing when it actually has
  matching transactions. Autonomy is the transaction's *effective* autonomy
  (`effectiveAutonomy` in `@/lib/classification.ts`: its own override, else
  its class's `autonomy`, else `DEFAULT_AUTONOMY` — "Alta" — so it's
  always a concrete Alta/Baixa, never "unset") — this is the one level
  that never folds a transaction into its parent without a row of its
  own; Category and Class do fold a transaction in when it has none
  (transactions with no category at all never reach a Category level at
  all, having already been split off into "Uncategorized" at the Type
  level; a class-less transaction under a "class" level just contributes
  to its parent's total with no Class child row). Row keys are built by
  threading `${level}:${bucketId}` onto the parent's own key
  (`buildLevelRows` in `dashboard-monthly-breakdown.ts`) so expand state
  stays distinct per branch regardless of level order — with a month
  column per month plus a trailing Total column (year sum of that row).
  `buildMonthlyBreakdown()` first splits `yearTransactions` into
  Type/Uncategorized buckets, then recurses `buildLevelRows` through the
  configured `levels` array, at each step grouping the transactions handed
  to it by that one level and recursing into the next — a category or
  class with zero transactions this year gets no row at all, so expanding
  a row never reveals an empty list. **A parent row's months come
  directly from the transactions handed into it, not from summing its
  children** — a Category node (or any node) can have transactions that
  don't produce a child row at the next level, so a node's total can
  legitimately exceed the sum of its visible children; this is
  intentional, not a bug to "fix" by adding a synthetic "none" row for
  every level (only Autonomy gets one). **Every kind, including Transfer,
  sums the signed `amount` as-is** — a 150 transfer out and a 150 transfer
  in nets to 0 here.
  **Why:** Baixa-before-Alta ordering, the Autonomy level's fixed "always a
  row of its own" behavior, and the signed (not `Math.abs`) Transfer sum
  are all per explicit user request. There used to be a third "Sem
  autonomy"/`"none"` bucket for a transaction with neither an override nor
  a class default — removed once `effectiveAutonomy` stopped ever
  returning null; `autonomyKey()` in `dashboard-monthly-breakdown.ts` is now
  just a thin alias for `effectiveAutonomy`, kept only so this file and
  `dashboard-explorer.tsx` didn't need an import-name churn. Don't
  reintroduce a "none" bucket without a fresh ask. The now-removed
  Transfers stat card used to sum `Math.abs(amount)` — magnitude, not net
  — so its own two legs wouldn't cancel out; this table was a deliberate
  divergence from that even before the card was deleted, see
  `dashboard-conventions`'s "removed-cards" history.

- **A footer `<tfoot>` "Total" row sums straight down each month column,
  plus a grand-total cell in the Total column**, symmetric with each row's
  own Total *column* (row-wise sum). `MonthlyBreakdownTable` computes this
  itself from the top-level `rows` prop only (`monthTotals`, one pass
  summing `row.months[i]` across every Type row; `grandTotal` is
  `monthTotals`'s own sum) — **not** from `TreeRows`, and **not**
  including Category/Class rows, since those are already folded into
  their parent Type row's `months`/`total` and would double-count if
  summed again. Styled `border-t font-medium` — just a rule, no
  background — to read as a spreadsheet-style footer; the header row is
  the same (`border-b`, no background, no top border, top of the table).
  This total is a plain arithmetic column-sum of signed amounts (Transfers
  included, see above), not a "Balance"-style figure — the now-removed
  Balance stat card deliberately excluded Transfers entirely rather than
  netting them in, so don't treat this total as a like-for-like
  replacement for it.
  **Why:** added per explicit user request. Both the header and footer
  used to have a `bg-muted` tint (and the Total column a darker one still)
  to make them stand out further, but that was removed per a later
  explicit request — don't reintroduce a background on either row without
  a fresh ask.

- **Values round to whole numbers, no decimals**:
  `dashboard-monthly-table.tsx`'s own `formatCurrency` uses
  `minimumFractionDigits: 0, maximumFractionDigits: 0`, specific to this
  table (the embedded transactions table keeps 2 decimals; see the naming
  note above for why this matters to get right).
  **Why:** per explicit user request.

- **A cell whose value is exactly `0` renders empty, not `"0"`.** Both the
  month cells and the trailing Total cell check `value === 0`
  (`row.total === 0` for the Total cell) and render an empty string
  instead of calling `formatCurrency`. This applies uniformly to every row
  (Type, Category, and Class alike) — don't special-case any one level to
  still show "0". The footer Total row's own cells follow the same rule
  (`monthTotals[i] === 0` / `grandTotal === 0`).
  **Why:** per explicit user request.

- **Type, Category, and Autonomy rows show only their icon/symbol, not
  their text name.** A Type row's `row.symbol` (the arrow from
  `TRANSACTION_TYPE_SYMBOLS` — `➔` rotated up/down/right via `TRANSACTION_TYPE_SYMBOL_ROTATION` for income/expense/transfer — one glyph so all three share the same heavy weight), a
  Category row's `row.icon` (`category.icon`, rendered via
  `CategoryIcon`), and a Autonomy row's padlock (`<AutonomyIcon autonomy={row.autonomy}>`,
  `src/components/autonomy-icon.tsx`, from `AUTONOMY_ICONS` in
  `@/lib/classification.ts`, shared app-wide — closed padlock for Baixa,
  open padlock for Alta, per explicit user request; were `▢`/`△` text
  glyphs) are enough on their own; the label `<span>` in `TreeRows` only
  renders when `hasIcon` (`!!row.icon || !!row.symbol || (isAutonomyLevel
  && !!row.autonomy)`) is false. Class rows carry
  `row.icon` (`classes.icon`) too now, so they're icon-only like Category
  rows (per explicit user request). The "Uncategorized" Type row has neither an icon nor
  a symbol, so it falls into that same `!hasIcon` fallback and keeps its
  text label — don't treat that as an inconsistency to "fix" by giving it
  a synthetic icon. The full name is still available as a native `title`
  tooltip on the row's icon-containing wrapper `<div>` so it isn't lost
  entirely, just hidden from the default view.
  **Why:** per explicit user request. Autonomy rows used to have neither an
  icon nor a symbol (so they kept their "Alta"/"Baixa" text label through
  this same fallback) until `AUTONOMY_SYMBOLS` was added — same mechanism,
  just a later addition; don't assume Autonomy is still a text-only level
  if this comes up again.

  **The Type symbol is rendered larger and bolder than the rest of the
  row** (`text-base font-bold`, vs. the table's base `text-sm`) — still
  `text-muted-foreground`, not colored to match the row's own
  income/expense color, to stay in this table's otherwise subdued style
  rather than adding more color weight. This sizing bump is Type-symbol-
  only — the Category icon (`CategoryIcon`, `size-3.5`) and the Autonomy
  symbol (plain text, no size override, so it renders at the row's default
  `text-sm`/`text-xs`) are both unaffected.
  **Why:** per explicit user request, to make the arrow read as a clear
  signal rather than blending into the row.

- **`MONTH_LABELS` (the column headers) is a plain lowercase array
  (`["jan", "fev", ..., "dez"]`), not `Intl.DateTimeFormat("pt-BR", {
  month: "short" })`.** The `<th>` still has `className="...
  capitalize"` so headers display "Jan", "Fev", etc. despite the array
  being lowercase — don't capitalize the array itself, that would just
  double up with the CSS.
  **Why:** the `Intl` short form renders with a trailing period ("jan.",
  "fev.", ...) in pt-BR, which showed up as dots on every month column
  header; a plain array sidesteps that entirely and matches the same
  `MONTH_ABBREVIATIONS` array `search/search-table.tsx`/
  `dashboard-transactions-table.tsx` already use for their Date column.

- **Row color is inherited down from the Type ancestor, not computed
  per-row.** The `TYPE_COLOR` map gives `"type:income"` unconditional
  `text-emerald-600` and `"type:expense"` unconditional `text-destructive`
  (Expenses being unconditionally red here is the same documented
  Dashboard exception to the Transactions-table "only positive gets color"
  rule, see `amount-color-conventions`); `"type:transfer"`/
  `"type:uncategorized"` get no color (`undefined`, plain foreground).
  Every Category/Class row under a Type just inherits that Type's color
  via a prop threaded through the recursion — don't give Category/Class
  rows their own color logic.
  **Why:** originally chosen to mirror the now-removed Income/Expenses
  stat cards' own colors, but this table keeps the rule on its own merits
  now that those cards are gone.

- **Expand state defaults to fully collapsed** (`useState<Set<string>>(new
  Set())` in `MonthlyBreakdownTable`) — only the 3-4 Type rows are visible
  on first render; a row only toggles if it actually has children, which
  naturally happens to whichever level the user has placed last in the
  "Levels" menu order. `TreeRows` styles off each row's own `row.level`
  field, not a fixed depth number — depth 0 is always Type, but which
  classification sits at depth 1/2/3 depends on the configured order, so
  Autonomy rows always get `border-t font-semibold` and Class rows always
  get `text-[11px]` regardless of where in the tree they land.
  **Why:** "I can see at maximum at class level" was the original explicit
  requirement, back when the level order was fixed and Class was always
  last — it's now just wherever the user puts the last configured level,
  not hardcoded to Class specifically.

- **There is no dedicated expand/collapse control any more, and the label
  cell no longer drives click-to-filter at all — clicking a row's label
  (its icon/symbol/name area) only toggles expand/collapse, when the row
  has children; it never sets the filter selection.** The label `<td>`'s
  `onClick` is `hasChildren ? () => onToggle(row.key) : undefined` — no
  `onSelect` call at all. A row with no children has no `onClick` on its
  label cell (and no hover styling either, since there's nothing to
  click). **No cell in this table uses `cursor-pointer`** — clickable
  cells (label-with-children, month, Total, header, footer) keep the
  default arrow cursor and signal clickability only via
  `hover:brightness-95`. The `<table>` itself is `cursor-default
  select-none` — without `cursor-default` the browser shows the text
  I-beam over every number, which the user read as "the cell looks
  editable"; `select-none` stops clicks from highlighting the text. Both
  per explicit user request; don't add the hand cursor back or drop
  these two classes without a fresh ask. **Click-to-filter now lives only on the month cells
  and the trailing Total cell** (each still calls `onSelect` exactly as
  before — a month cell scopes to `{ ...rowSelection, month: i }`, the
  Total cell scopes to the whole row via `rowSelection` alone). The label
  cell still shows the `SELECTED_CELL` ring when `wholeRowSelected` is
  true, purely as a read-only indicator — selecting that state has to come
  from clicking the row's own Total cell (or a month cell).
  **Why:** per explicit user request, so browsing the tree (expanding
  levels to look around) no longer has the side effect of also changing
  what the embedded transactions table below is filtered to — only a
  deliberate click on an actual amount (a month or the Total) does that
  now. This briefly went through an interim state where the label click
  did both (toggle and select together in one click) — that was reversed
  by this same request; don't reintroduce `onSelect` on the label cell
  without a fresh ask. The expand/collapse mechanism itself used to be a
  dedicated `ChevronRightIcon`/`ChevronDownIcon` `<button>` inside the
  label cell (before that, `PlusIcon`/`MinusIcon`, chosen to avoid visual
  confusion with `SortableTableHead`'s own chevron-based sort arrows) —
  removed once the toggle moved onto the label click itself.

- **This table is plain `<table>` markup, `table-layout: auto` (no
  `table-fixed`, no `<colgroup>`)** — columns size to their own content
  instead of a fixed 16%/6%×12/12% split, so a long Category/Class label
  (or a month with an unusually wide number) can make its column wider,
  shrinking the others in response. The label cell still caps growth at
  `max-w-56 truncate` (on the `<td>` itself, not just the inner `span` —
  see `table-page-conventions`'s `truncate`+`max-w-*` rule, which applies
  here too even though this table doesn't use shadcn's `Table`) so one
  very long label can't crush the 12 month columns down to nothing; the
  month/Total cells stay `whitespace-nowrap` so their own natural
  (numeric) content width is what auto-layout sizes them to — further
  narrowed whenever a cell is empty (see the zero-value rule above),
  which is fine and expected. The *column* set here (label + 12 months +
  Total) is still static and never hidden/reordered by column —
  `ColumnsMenu`/`useColumnPreferences` is only reused for the separate
  "Levels" menu (which rows/depth get built, not which columns render);
  don't conflate the two or assume the month columns became configurable
  too.
  **Why:** per explicit user request — the user explicitly accepted that
  columns shift as rows expand/collapse in exchange for numbers/labels
  fitting tightly instead of floating in fixed-width cells.

- **Frozen panes: header row, footer Total row, label column, and Total
  column all stay visible when the table doesn't fit the window.** The
  outer wrapper is `max-h-[70vh] overflow-auto` (was `overflow-x-auto`
  before), so the table scrolls both axes inside its own bounded box
  instead of just growing the page horizontally. `position: sticky` is
  applied per-cell (not on `<tr>` — sticky on table rows is unreliable
  across browsers), not per-row: every `<th>`/`<td>` in `<thead>` gets
  `sticky top-0`, every one in `<tfoot>` gets `sticky bottom-0`, the label
  cell in every row (including header/footer) gets `sticky left-0`, and
  the Total cell in every row gets `sticky right-0`. Each sticky cell
  needs its own opaque background (`bg-background`, or the row's own
  `rowBg` when it has one) so cells scrolling underneath don't bleed
  through — this is why the Total `<td>` falls back to `rowBg ??
  "bg-background"` for its background class specifically, kept separate
  from the plain `rowBg` still used for the unrelated `font-bold` check
  just below it (don't collapse those two into one `rowBg` reference
  again). Z-index is layered 10/20/30: body-row sticky label/Total cells
  are `z-10`, header/footer non-corner sticky cells are `z-20`, and the
  four corner cells (sticky on *two* axes at once — top+left, top+right,
  bottom+left, bottom+right) are `z-30` so they stay above both
  single-axis sticky layers during diagonal scroll. `border-r`/`border-l`
  were added to the label/Total columns as a visual seam marking the
  frozen edge — a purely additive touch, not required for the sticky
  mechanism itself.
  **Why:** added per explicit user request.

- **Drives the embedded transactions table's click-to-filter entirely on
  its own.** `dashboard-explorer.tsx` holds a single `selection:
  MonthlySelection | undefined`, passed to this table as `selected` and
  updated via its `onSelect` prop. Every `MonthlyRow` carries its own
  `kind`/`autonomy`/`categoryId`/`classId` (not just its display `key`) so
  a click handler doesn't need to re-derive them. **Clicking a row's Total
  cell filters to that row's whole year; clicking one of its month cells
  scopes it to that month too — the row's label cell is not part of this
  at all any more** (see the expand/collapse bullet above: the label only
  toggles expand/collapse, it never touches the selection). Clicking a
  month header/footer cell filters to that month across every type (`kind`
  left `undefined` in the `MonthlySelection`); clicking the Total
  header/footer cell shows the full year unrestricted — the same
  "everything" case the now-removed "Accounts" stat card used to cover.
  Re-clicking the exact same selection clears it (`monthlySelectionsEqual`
  in `dashboard-explorer.tsx`). The clicked cell/row/column gets a `ring-2
  ring-inset ring-primary` highlight (`SELECTED_CELL` in
  `dashboard-monthly-table.tsx`) — the label cell can still show this ring
  when its row is `wholeRowSelected`, but only as a read-out of a
  selection made via the Total/month cells, never as something clicking
  the label itself causes.
  **Why:** this table used to be deliberately unwired from a separate
  stat-card click-to-filter, then got wired in alongside the cards, then
  became the sole driver once the cards were removed (see
  `dashboard-conventions`'s "removed-cards" history); check git history
  before assuming either the disconnection or the card-sharing still
  applies.
