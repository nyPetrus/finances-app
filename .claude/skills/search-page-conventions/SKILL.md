---
name: search-page-conventions
description: Use when touching the Search page (src/app/search/ — page.tsx, search-form.tsx, search-table.tsx, filters.ts, sort.ts, bulk-edit-dialog.tsx) — its 7 optional filters (Account/Category/Class/Gordura as checkbox multi-selects, Description/Date/Amount as operator+value controls), how filter state round-trips through the URL, the Supabase query-building/paging behind "Apply", the count+total results-summary block, its results table (a near-copy of TransactionsTable), or the Search-only batch Category/Class/Gordura editor on selected rows. Not part of the shared table-page-conventions architecture (this page doesn't own/create rows the way a canonical list page does), though its results table borrows heavily from it.
---

# Search page conventions

`/search` lets the user query transactions across all time (not scoped to a
month, unlike `/transactions`) by combining up to 7 independent, optional
filters — Account, Category, Class, Gordura, Description, Date, Amount —
then clicking "Apply". Added per explicit user request.

- **Every filter is optional and AND-combined; there is no default,
  unfiltered "show everything" state.** `src/app/search/page.tsx` only
  runs a query when `hasAnyFilter(filters)` is true (`filters.ts`) — with
  zero filters set, the results area (summary block + table, see below)
  renders nothing at all, no hint text. Don't remove this guard to
  "simplify" the page. **Apply and Clear are themselves disabled (dimmed
  via the Button component's own `disabled` styling) whenever every
  filter field is empty** — `search-form.tsx`'s `hasAnyValue`, computed
  from current local state (not the `filters` prop), so unchecking every
  checkbox / clearing every field re-disables both buttons live, before
  the user even clicks Apply.
  **Why:** the query guard is deliberate, not just an easy default —
  without it, a bare page load (or a "Clear" click) would trigger an
  unbounded query. A muted hint text used to sit in the results area
  instead of the disabled-buttons treatment, but was removed per explicit
  user request when Apply/Clear started reflecting the same "nothing to
  search yet" state live — don't re-add the hint text without a fresh ask.
- **State is fully URL-driven, the same pattern `/transactions` uses for
  `month`/`sort`/`dir`** — `search-form.tsx` (`"use client"`) reads its
  initial field values from a `filters: ParsedFilters` prop (computed
  server-side in `page.tsx` via `parseFilters()`, `filters.ts`) and, on
  "Apply", builds a fresh `URLSearchParams` from its own local state and
  `router.push("/search?...")`s to it — it does **not** call a server
  action. `page.tsx` re-parses `searchParams` on every request and re-runs
  the query; there's no client-side re-filtering of an already-fetched
  set. "Clear" resets all local state and pushes bare `/search`.
- **Filter → URL param mapping** (`filters.ts` is the single source of
  truth for all of these — both `page.tsx` and `search-form.tsx` import
  from it, never redefine locally):
  - **Account, Category, Class, Gordura are checkbox multi-selects, not
    operator+value controls.** Each renders via the shared
    `CheckboxSelect` component (`src/components/checkbox-select.tsx`, also
    used nowhere else yet) and round-trips as a **repeated** query param —
    `?account=id1&account=id2`, parsed by `filters.ts`'s `many()` helper —
    with OR semantics (match any checked value) and an **empty array
    meaning "no filter"**, not "match nothing." `ParsedFilters.accounts` /
    `.categories` / `.classes` / `.gorduras` are plain `string[]` (no `op`
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
    - **Gordura**: `gordura` (`"high"` | `"low"` — `Gordura`,
      `GORDURA_VALUES` for the fixed Baixa/Alta order, `GORDURA_VALUE_LABELS`
      — an alias for `GORDURA_LABELS` — for display). Filters on the
      transaction's **effective** gordura (`effectiveGorduraValue()` in
      `filters.ts`, a thin alias for `effectiveGordura()` from
      `@/lib/classification.ts`, same as the Dashboard monthly table's
      `gorduraKey()`), not just its own override column — always a concrete
      Alta/Baixa, never "unset" (`effectiveGordura` falls back to
      `DEFAULT_GORDURA`, "Alta", when there's no override and no class
      default). Because "effective" needs the class join, this is the one
      filter `buildQuery()` (`page.tsx`) **can't** push into the Supabase
      query — it's applied in JS *after* `runSearch()` has already paged
      through everything matching the other filters (still correct per
      `PITFALLS.md`, since the Postgres query itself isn't what's
      narrowing on gordura, so it can't silently truncate).
      **Why only two values:** there used to be a third "Sem gordura"/
      `"none"` option here, removed once `effectiveGordura`'s fallback
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
    to compare directly against the `date` timestamp column, the same
    trick `transactions/page.tsx`'s own month-scoping already relies on):
    "on" is `gte(start).lt(end)`, "before" is `lt(start)`, "after" is
    `gte(end)`. **Changing the granularity `<Select>` resets `dateValue`
    to `""`** (`search-form.tsx`) — a value shaped for one granularity
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
    "Apply" itself carries forward whatever `sort`/`dir` were already in
    the URL (`search-form.tsx` reads them via `useSearchParams()` before
    building its new query string) so re-filtering doesn't reset the
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
- **The results table (`search-table.tsx`) is a near-verbatim copy of
  `TransactionsTable`, for the same reasons `dashboard-transactions-table.tsx`
  is a copy and not a reuse** (see `dashboard-conventions`) — same
  `COLUMNS`/`renderCell`, same `RowActionsMenu`/`ColumnsMenu`/
  `useRowSelection`/`useColumnPreferences` (own `storageKey`:
  `"search-table"`), same edit dialog (including the "Save and map
  description" → `AddMappingDialog` handoff, see
  `transaction-description-rules`), same toolbar shape and
  `AddTransactionDialog`/"Create an account first" left-slot swap from
  `table-page-conventions`. **The one real difference is `sortHref()`**:
  it preserves the full current query string (all filters) instead of
  just one page-level param like `month`. When a `TransactionsTable`
  feature is added, check whether it belongs here too, same as the
  Dashboard's copy.
- **Batch-editing selected transactions' Category/Class/Gordura is a
  Search-only feature** — not added to `TransactionsTable` or the
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
  `gordura`), so choosing only Gordura doesn't force a Category/Class onto
  every selected row. "No change" is therefore distinct from a `CLEAR`
  sentinel (`"Uncategorized"` / `"No class"` / `"Class default"`), which
  *does* get sent — as an explicit `null` — to blank out that field on
  every selected transaction. Picking a specific Category narrows the Class
  options to `pickableClasses(classes, categoryValue, null)` (same picker
  rule the single-transaction edit dialog uses) and drops a now-invalid
  Class selection back to "No change"; with Category left on "No
  change"/"Uncategorized" instead, Class offers every active class
  unfiltered, since there's no single category to narrow by. Like
  `deleteTransactions`, it revalidates `/transactions`, `/search`,
  `/budget`, and `/` (category/class changes affect Budget and Dashboard
  too), and the dialog clears the row selection on success
  (`onSaved={clearSelection}`). Added per explicit user request.
- **Mutations from this table's row actions
  (`deleteTransactions`/`updateTransaction`/`syncDescriptionsFromTransactions`/
  `bulkUpdateClassification`, all reused from `transactions/actions.ts` — no
  `search/actions.ts` exists) also `revalidatePath("/search")`**, alongside their existing
  `revalidatePath("/transactions")` calls — and so does every other action
  anywhere in the app that already revalidates `/transactions`
  (`accounts/actions.ts`, `accounts/pluggy-actions.ts`,
  `categories/actions.ts`, `descriptions/actions.ts`): editing a category's
  name, deleting an account, syncing mapped descriptions, etc. can all
  change what a live Search results page shows, the same cross-page
  dependency reasoning `table-page-conventions`'s "Mutations" bullet
  already documents for `/transactions` itself. A new mutation that adds
  `revalidatePath("/transactions")` should add `revalidatePath("/search")`
  right next to it, not just the one path.
- **Nav entry**: `sidebar-nav.tsx`'s `links` array, `SearchIcon`
  (`lucide-react`), positioned between Budget and Transactions.
  **Why:** moved there per explicit user request, from directly after
  Transactions — check the current array rather than assuming either
  position if this ever comes up again.
