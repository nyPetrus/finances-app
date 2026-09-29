---
name: search-page-conventions
description: Use when touching the Search page (src/app/search/ — page.tsx, filter-bar.tsx, filter-editors.tsx, search-table.tsx, filters.ts, sort.ts, bulk-edit-dialog.tsx) — its Supabase-style single-line filter bar (chips + typed suggestions) over 7 optional filters (Account/Category/Class/Autonomy as checkbox multi-selects, Description/Amount as operator+value, Date as operator + Year/Month/Day picker), how filter state round-trips through the URL, the Supabase query-building/paging behind it, the count+total results-summary block, its results table (the app's main transaction table, incl. the Sync descriptions button), the current-month default, the /transactions redirect, or the Search-only batch Category/Class/Autonomy editor on selected rows. Not part of the shared table-page-conventions architecture (this page doesn't own/create rows the way a canonical list page does), though its results table borrows heavily from it.
---

# Search page conventions

`/search` is the app's transactions page (the old `/transactions` page
was folded into it — see below). It opens on the current month but can
query transactions across all time by combining up to 7 independent, optional
filters — Account, Category, Class, Autonomy, Description, Date, Amount.
Added per explicit user request.

- **Every filter is optional and AND-combined; there is no default,
  unfiltered "show everything" state.** `src/app/search/page.tsx` only
  runs a query when `hasAnyFilter(filters)` is true (`filters.ts`) — with
  zero filters set, the results area (summary block + table, see below)
  renders nothing at all, no hint text. Don't remove this guard to
  "simplify" the page.
  **Why:** the query guard is deliberate, not just an easy default —
  without it, a bare page load (or clearing every chip) would trigger an
  unbounded query. Don't re-add a "nothing to search yet" hint text
  without a fresh ask (one was removed per explicit user request).
- **The filters are a single-line, Supabase-style filter bar**
  (`filter-bar.tsx`, `SearchFilterBar`), modeled on the Supabase Table
  Editor's filter bar per explicit user request (it replaced a
  one-row-per-filter form, to save vertical space on mobile). One bordered
  box holds a chip per active filter (fixed `FIELDS` order) followed by a
  text input:
  - **Chips** follow the app-wide symbol-display rule
    (`table-page-conventions`): values with a symbol show only it, name as
    tooltip — `Category: 🛒 🚌` (category icons via `Option.icon`),
    `Autonomy: △` (`Option.chip`), up to 5 symbols before `+N`; values
    without one show names — `Account: Nubank, XP` (3+ values: `Nubank, XP +1`),
    `Description contains "uber"`, `Amount > -50`, `Date: Sep 2026` /
    `Date before Sep 2026` — field name muted, value bold; a colon only
    for list-style values (`readsAsSentence()`). Clicking a chip reopens
    that field's editor; its ✕ removes it; a trailing ✕ clears all.
  - **The input** opens a panel (inline `absolute` div under the bar, not
    a portal — so the outside-press listener can just check
    `containerRef.contains`). Empty input → the 7 fields (active ones show
    their current value). Typing → ready-made suggestions: `Amount =
    <n>` (only when numeric), `Description contains "<text>"`, and up to 6
    matching Account/Category/Class/Autonomy option names (added to that
    field's set); when the text is the start of a field name ("cat") the
    field rows come first instead. Arrow keys move the highlight, Enter
    picks it (so plain typing + Enter = Description contains), Backspace on
    an empty input removes the last chip, Escape closes.
  - **Editors** (`filter-editors.tsx`): `CheckboxEditor` (checkbox list,
    a find box when > 8 options, Clear + Apply; applying none removes the
    filter), `OperatorEditor` (segmented operator + value input, Enter or
    Apply; an empty value removes the filter — the operator stays a real
    choice, don't swap it for typed-prefix syntax like `^uber`, which was
    considered and rejected as too hidden), and `DateEditor` (see Date
    below).
  - **Every finished edit applies immediately** — no whole-form
    Apply/Clear buttons. `apply()` updates a local copy of the filters (so
    the chip changes instantly, re-synced from the `filters` prop whenever
    the URL changes) and `router.push`es inside `startTransition`; the
    search icon turns into a spinner while pending.
- **State is fully URL-driven, the same pattern the list pages use for
  `sort`/`dir`** — `filter-bar.tsx` reads the current filters
  from a `filters: ParsedFilters` prop (computed server-side in `page.tsx`
  via `parseFilters()`, `filters.ts`) and pushes
  `filtersToSearchParams(next)` (`filters.ts`, the inverse of
  `parseFilters`) — it does **not** call a server action. `page.tsx`
  re-parses `searchParams` on every request and re-runs the query; there's
  no client-side re-filtering of an already-fetched set. Clearing every
  filter pushes bare `/search`.
- **Filter → URL param mapping** (`filters.ts` is the single source of
  truth for all of these — `page.tsx`, `filter-bar.tsx` and
  `filter-editors.tsx` import from it, never redefine locally):
  - **Account, Category, Class, Autonomy are checkbox multi-selects, not
    operator+value controls.** Each is edited in `CheckboxEditor` and
    round-trips as a **repeated** query param —
    `?account=id1&account=id2`, parsed by `filters.ts`'s `many()` helper —
    with OR semantics (match any checked value) and an **empty array
    meaning "no filter"**, not "match nothing." `ParsedFilters.accounts` /
    `.categories` / `.classes` / `.autonomies` are plain `string[]` (no `op`
    field at all — don't reintroduce `EqualityOp`/`is`/`is_not` for these
    four).
    **Why:** replaces an earlier `is`/`is not` single-value design, per
    explicit user request — that's exactly what the checkbox redesign
    was for, so don't bring the operator back for these four fields.
    - **Account**: `account` (account ids). No pseudo-value — every
      transaction has an `account_id`.
    - **Category**: `category` (category ids, plus the literal string
      `"uncategorized"` — `UNCATEGORIZED_VALUE` — for "no category").
    - **Class**: same shape, with `"unclassed"` (`UNCLASSED_VALUE`) as its
      pseudo-value.
    - **Autonomy**: `autonomy` (`"high"` | `"low"` — `Autonomy`,
      `AUTONOMY_VALUES` for the fixed Baixa/Alta order; the checkbox list
      shows `autonomyOptionLabel()` — "▢ Baixa"/"△ Alta" — while the chip
      shows just the symbol via the option's `chip` field, e.g.
      `Autonomy: △`, per the app-wide "autonomy displays as a symbol" rule in
      `@/lib/classification.ts`). Filters on the
      transaction's **effective** autonomy (`effectiveAutonomyValue()` in
      `filters.ts`, a thin alias for `effectiveAutonomy()` from
      `@/lib/classification.ts`, same as the Dashboard monthly table's
      `autonomyKey()`), not just its own override column — always a concrete
      Alta/Baixa, never "unset" (`effectiveAutonomy` falls back to
      `DEFAULT_AUTONOMY`, "Alta", when there's no override and no class
      default). Because "effective" needs the class join, this is the one
      filter `buildQuery()` (`page.tsx`) **can't** push into the Supabase
      query — it's applied in JS *after* `runSearch()` has already paged
      through everything matching the other filters (still correct per
      `PITFALLS.md`, since the Postgres query itself isn't what's
      narrowing on autonomy, so it can't silently truncate).
      **Why only two values:** there used to be a third "unset"/
      `"none"` option here, removed once `effectiveAutonomy`'s fallback
      stopped ever being null — don't reintroduce it without a fresh ask.
    - `buildQuery()`'s `applyCheckboxFilter()` handles Account/Category/
      Class: plain `.in(column, ids)` when no pseudo-value is checked,
      `.is(column, null)` when only the pseudo-value is checked, and
      `.or(`${column}.is.null,${column}.in.(...)`)` when both are checked
      at once (`.in()` alone never matches `NULL` rows). Multiple `.or()`
      calls for different columns (e.g. Category's mixed case and Class's
      mixed case in the same search) compose as AND at the PostgREST level
      — confirmed against `postgrest-js`'s `or()`, which `.append()`s
      rather than `.set()`s, so repeated `or` query params don't clobber
      each other.
  - **Description**: `description` (free text, trimmed) + `descriptionOp`
    (`"equal_to"` | `"starts_with"` | `"contains"`, default `"contains"`)
    — deliberately the *same three operators* `mapped_descriptions.check_type`
    already uses (see `transaction-description-rules`), for consistency
    with the rest of the app's description-matching UI, not because the
    two features share code. Matched case-insensitively via `.ilike()`
    (transactions' `description` is stored lowercase already — see
    `transaction-description-rules` — but the search *input* isn't
    constrained to lowercase, so `ilike` does the normalizing); the raw
    value is escaped (`escapeIlike()`, backslash-escapes `%`/`_`) before
    being wrapped in `%...%`/`...%` so a literal `%` or `_` the user typed
    doesn't act as a wildcard.
  - **Date**: `dateGranularity` (`"year"` | `"month"` | `"day"`) +
    `dateValue` (a plain string shaped by the granularity — `"2026"`,
    `"2026-09"`, or `"2026-09-15"`, matching what a native `<input
    type="month">`/`type="date">` already emits) + `dateOp` (`"on"` |
    `"before"` | `"after"`, default `"on"` — no inclusive-boundary or
    between-two-dates variants, per explicit user decision).
    `dateRangeFor()` (`filters.ts`) turns granularity+value into a
    half-open `{ start, end }` pair of plain `"YYYY-MM-DD"` strings (safe
    to compare directly against the `date` timestamp column):
    "on" is `gte(start).lt(end)`, "before" is `lt(start)`, "after" is
    `gte(end)`. **Editing UI is `DateEditor`** (`filter-editors.tsx`): an
    On/Before/After segmented control, shortcut buttons (This month /
    Last month / This year), and a Year | Month | Day level switch —
    Month is the default level — over a 12-year grid, a 12-month grid
    with year arrows, or the shadcn `Calendar`. Picking a value applies
    at once with the current operator; the footer Apply only matters
    after changing just the operator. Chip text comes from
    `formatDateValue()` (`filters.ts`, fixed English `MONTH_LABELS`, no
    `Intl`, so server and client render identically). **Switching the
    level resets the value to `""`** — a value shaped for one granularity
    (e.g. `"2026-09-15"`) is meaningless for another (e.g. as a year), so
    don't try to convert between them instead.
  - **Amount**: `amount` (a plain number string, validated finite in
    `parseFilters()` — non-numeric values are dropped, i.e. treated as
    "no amount filter") + `amountOp` (`"equal_to"` | `"greater_than"` |
    `"less_than"`, default `"equal_to"`, no inclusive/between variants).
    Compared against the **signed** amount, exactly as the Amount column
    displays it (expenses are negative), so "Greater than -50" includes
    positive amounts and smaller expenses — it is not an absolute-value
    comparison. `buildQuery()` maps the ops to `.eq`/`.gt`/`.lt` on
    `amount`.
  - `sort`/`dir` ride along unchanged from `table-page-conventions`'s
    URL-driven-sort pattern — `search-table.tsx`'s `sortHref()` clones the
    *entire current* `useSearchParams()` (so every active filter param
    survives a column-header click) and only overwrites `sort`/`dir`, and
    every filter change carries forward whatever `sort`/`dir` were
    already in the URL (`filter-bar.tsx`'s `apply()` reads them via
    `useSearchParams()` before pushing) so re-filtering doesn't reset the
    user's chosen sort.
- **Query building pages through `.range()`, the same reason
  `fetchAllTransactionsInRange()` does** (see `PITFALLS.md`) — a single
  broad filter (e.g. just "Account is X" with no date bound) can easily
  return more than PostgREST's 1000-row cap across a multi-year history.
  `buildQuery()` (`page.tsx`) is a **factory function**, re-invoked fresh
  on every page of the loop in `runSearch()` — Supabase query builders are
  meant to be executed once each, so don't try to build one query object
  and reuse it across `.range()` calls.
- **A results-summary block sits between the form and the table**: a
  bordered `rounded-md` bar (`page.tsx`, inline JSX, no separate
  component) showing the count ("1 transaction" / "N transactions",
  matching the singular/plural pattern `BulkEditDialog`'s title already
  uses) and the **signed** sum of `sortedResults.amount` (transfers net
  toward 0, same convention as the Dashboard monthly table and the Amount
  column — see `amount-color-conventions`), colored `text-emerald-600`
  only when `>= 0`, otherwise the default text color — the same "only
  positive gets color" rule as the Amount column, applied to the
  aggregate rather than a single row. Rendered under the same
  `searchActive` guard as the table (one `<>...</>` fragment covers both),
  so it never shows with zero filters applied, and does show "0
  transactions · Total: 0,00" when a filter matches nothing. Added per
  explicit user request.
- **The results table (`search-table.tsx`) is the app's main transaction
  table** — it started as a near-verbatim copy of the old Transactions
  page's `TransactionsTable` (since removed along with that page), and the
  Dashboard's `dashboard-transactions-table.tsx` is a separate hand-synced
  copy of the same design (see `dashboard-conventions`) — same
  `COLUMNS`/`renderCell`, same `RowActionsMenu`/`ColumnsMenu`/
  `useRowSelection`/`useColumnPreferences` (own `storageKey`:
  `"search-table"`), same edit dialog (including the "Save and map
  description" → `AddMappingDialog` handoff, see
  `transaction-description-rules`), same toolbar shape and
  `AddTransactionDialog`/"Create an account first" left-slot swap from
  `table-page-conventions`, plus the Sync descriptions `SyncButton`
  (`descriptions/sync-button.tsx`) next to Add — moved here from the old
  Transactions page per explicit user request. `sortHref()` preserves
  the full current query string (all filters). When a transaction-table
  feature is added here, check whether it belongs in the Dashboard's
  copy too, same as the
  Dashboard's copy.
- **Batch-editing selected transactions' Category/Class/Autonomy is a
  Search-only feature** — not added to the
  Dashboard's embedded table, unlike most of this table's other
  functionality (see the previous bullet). The "Edit selected"
  `PencilIcon` button in the toolbar (next to Delete, same
  `selected.size > 0` visibility) opens `BulkEditDialog`
  (`search/bulk-edit-dialog.tsx`), which posts to `bulkUpdateClassification`
  in `transactions/actions.ts`. **Each of the three fields defaults to "No
  change" and is a real, separately-selectable option** (not implied by
  leaving a `Select` untouched) — `bulkUpdateClassification(ids, updates)`
  only writes a field when its key is present in `updates` at all (`"key"
  in updates`, the same presence-check `updateTransaction` already uses for
  `autonomy`), so choosing only Autonomy doesn't force a Category/Class onto
  every selected row. "No change" is therefore distinct from a `CLEAR`
  sentinel (`"Uncategorized"` / `"No class"` / `"Class default"`), which
  *does* get sent — as an explicit `null` — to blank out that field on
  every selected transaction. Picking a specific Category narrows the Class
  options to `pickableClasses(classes, categoryValue, null)` (same picker
  rule the single-transaction edit dialog uses) and drops a now-invalid
  Class selection back to "No change"; with Category left on "No
  change"/"Uncategorized" instead, Class offers every active class
  unfiltered, since there's no single category to narrow by. Like
  `deleteTransactions`, it revalidates `/search`,
  `/budget`, and `/` (category/class changes affect Budget and Dashboard
  too), and the dialog clears the row selection on success
  (`onSaved={clearSelection}`). Added per explicit user request.
- **Mutations from this table's row actions
  (`deleteTransactions`/`updateTransaction`/`syncDescriptionsFromTransactions`/
  `bulkUpdateClassification`, all reused from `transactions/actions.ts` — no
  `search/actions.ts` exists) `revalidatePath("/search")`** — and so does
  every other action that can change a transaction's displayed data
  (`accounts/actions.ts`, `accounts/pluggy-actions.ts`,
  `accounts/import-actions.ts`, `accounts/google-drive-actions.ts`,
  `categories/actions.ts`, `classes/actions.ts`,
  `descriptions/actions.ts`): editing a category's name, deleting an
  account, syncing mapped descriptions, etc. can all change what a live
  Search results page shows (the cross-page dependency reasoning in
  `table-page-conventions`'s "Mutations" bullet). There is no
  `revalidatePath("/transactions")` any more — `/transactions` is just a
  redirect now (see the next bullet).
- **`/transactions` redirects to Search** (`transactions/page.tsx`) — the
  old Transactions page was removed per explicit user request, since
  Search covers it. `?month=YYYY-MM` becomes
  `/search?dateGranularity=month&dateOp=on&dateValue=YYYY-MM`; anything
  else goes to bare `/search`. `transactions/actions.ts`,
  `add-transaction-dialog.tsx` and `sort.ts` stay in that folder because
  Search and the Dashboard import them.
- **Search opens on the current month.** When the URL has no filter
  params (`!hasAnyFilter(parseFilters(...))`, so a bare `/search` or one
  with only `sort`/`dir`) and no `cleared` param, `page.tsx` substitutes
  a `Date: <current month>` filter — it shows as a normal, removable
  chip. Clearing every chip pushes `/search?cleared=1` (not bare
  `/search`) so a deliberately emptied search stays empty instead of
  snapping back to the month. The month is computed server-side, same as
  the old Transactions page did. This doesn't weaken the no-unbounded-
  query guard above: the default *is* a filter.
- **Nav entry**: `sidebar-nav.tsx`'s `links` array, `SearchIcon`
  (`lucide-react`), positioned between Budget and Transactions.
  **Why:** moved there per explicit user request, from directly after
  Transactions — check the current array rather than assuming either
  position if this ever comes up again.
