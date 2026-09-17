---
name: search-page-conventions
description: Use when touching the Search page (src/app/search/ — page.tsx, search-form.tsx, search-table.tsx, filters.ts, sort.ts) — its 5 optional per-filter operator+value controls (Account/Category/Class/Description/Date), how filter state round-trips through the URL, the Supabase query-building/paging behind "Apply", or its results table (a near-copy of TransactionsTable). Not part of the shared table-page-conventions architecture (this page doesn't own/create rows the way a canonical list page does), though its results table borrows heavily from it.
---

# Search page conventions

`/search` lets the user query transactions across all time (not scoped to a
month, unlike `/transactions`) by combining up to 5 independent, optional
filters — Account, Category, Class, Description, Date — each with its own
operator, then clicking "Apply". Added per explicit user request.

- **Every filter is optional and AND-combined; there is no default,
  unfiltered "show everything" state.** `src/app/search/page.tsx` only
  runs a query when `hasAnyFilter(filters)` is true (`filters.ts`) — with
  zero filters set, the page shows a muted hint ("Set at least one filter
  above and click Apply...") instead of dumping the user's entire
  transaction history. This is deliberate, not just an easy default:
  without it, a bare page load (or a "Clear" click) would trigger an
  unbounded query. Don't remove this guard to "simplify" the page.
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
  - **Account**: `account` (an account id) + `accountOp` (`"is"` |
    `"is_not"`, default `"is"`).
  - **Category**: `category` (a category id, or the literal string
    `"uncategorized"` — `UNCATEGORIZED_VALUE`) + `categoryOp`. The
    "uncategorized" pseudo-value can never collide with a real id, so it's
    handled by branching in `buildQuery()` (`page.tsx`) rather than a
    lookup: `.is("category_id", null)` for "is", `.not("category_id",
    "is", null)` for "is not".
  - **Class**: same shape as Category, with `"unclassed"`
    (`UNCLASSED_VALUE`) as its pseudo-value.
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
    `"before"` | `"after"`, default `"on"`, per explicit user decision —
    no inclusive-boundary or between-two-dates variants). `dateRangeFor()`
    (`filters.ts`) turns granularity+value into a half-open `{ start, end
    }` pair of plain `"YYYY-MM-DD"` strings (safe to compare directly
    against the `date` timestamp column, the same trick
    `transactions/page.tsx`'s own month-scoping already relies on): "on"
    is `gte(start).lt(end)`, "before" is `lt(start)`, "after" is
    `gte(end)`. **Changing the granularity `<Select>` resets `dateValue`
    to `""`** (`search-form.tsx`) — a value shaped for one granularity
    (e.g. `"2026-09-15"`) is meaningless for another (e.g. as a year), so
    don't try to convert between them instead.
  - `sort`/`dir` ride along unchanged from `table-page-conventions`'s
    URL-driven-sort pattern — `search-table.tsx`'s `sortHref()` clones the
    *entire current* `useSearchParams()` (so every active filter param
    survives a column-header click) and only overwrites `sort`/`dir`, and
    "Apply" itself carries forward whatever `sort`/`dir` were already in
    the URL (`search-form.tsx` reads them via `useSearchParams()` before
    building its new query string) so re-filtering doesn't reset the
    user's chosen sort.
- **Query building pages through `.range()`, the same reason
  `syncAllMappedDescriptions()` does** (see `PITFALLS.md`) — a single
  broad filter (e.g. just "Account is X" with no date bound) can easily
  return more than PostgREST's 1000-row cap across a multi-year history.
  `buildQuery()` (`page.tsx`) is a **factory function**, re-invoked fresh
  on every page of the loop in `runSearch()` — Supabase query builders are
  meant to be executed once each, so don't try to build one query object
  and reuse it across `.range()` calls.
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
- **Mutations from this table's row actions
  (`deleteTransactions`/`updateTransaction`/`syncDescriptionsFromTransactions`,
  all reused from `transactions/actions.ts` — no `search/actions.ts`
  exists) also `revalidatePath("/search")`**, alongside their existing
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
  (`lucide-react`), positioned right after Transactions (both are
  transaction-shaped pages) and before Categories.
