---
name: transaction-description-rules
description: Use when writing or touching code that inserts/updates a transaction's description, or that bulk-categorizes transactions from history (src/app/transactions/actions.ts, src/app/accounts/pluggy-actions.ts, src/app/descriptions/actions.ts) — covers the mandatory lowercase-description rule, the single uncategorized-only bulk-categorization action (a "sort all"/override-existing variant was removed per explicit user request), and the "Save and map description" edit-to-mapping handoff.
---

# Transaction description rules

- **`transactions.description` is always stored lowercase.** Enforced in
  `src/app/transactions/actions.ts` (manual add/edit) and
  `src/app/accounts/pluggy-actions.ts` (Pluggy sync) — any new path that
  inserts or updates a transaction's description must lowercase it first.
  Existing rows were backfilled once via
  `supabase/migrations/0012_lowercase_transaction_descriptions.sql`.

- **There is exactly one way to bulk-categorize transactions from
  history**: `syncMappedDescriptions()` in
  `src/app/descriptions/actions.ts`, backed by a private
  `applyMappingSet()` matcher (`equal_to` beats `starts_with` beats
  `contains`, longest pattern wins within a tier, each transaction claimed
  by at most one mapping). It applies the *existing* `mapped_descriptions`
  rules to every transaction with `category_id is null` — surfaced as the
  "Sync" button in `DescriptionsTable`'s own toolbar and on Transactions'
  own toolbar (both reusing the same `SyncButton` component — see
  `table-page-conventions`), plus `AddMappingDialog`'s "Create and sort
  unmapped" and `DescriptionsTable`'s edit dialog's "Sort unmapped" (see
  below). Don't reintroduce a "sort all"/override-existing-categorization
  action without a fresh ask; the uncategorized-only
  `syncMappedDescriptions` is the only bulk-categorize path now, and it
  stays narrow enough (`category_id is null`) to not need `.range()`
  paging — if a future "match everything" variant comes back, re-add the
  `.range()` paging this used to need (see `PITFALLS.md`), it isn't
  guaranteed under Supabase/PostgREST's 1000-row cap the way the
  uncategorized-only query is.
  **Why:** there used to be a second, "sort all" variant
  (`syncAllMappedDescriptions()`, matching *every* transaction regardless
  of current `category_id` so a mapping could override an existing
  category/class, surfaced as `AddMappingDialog`'s "Create and sort all"
  and the edit dialog's "Sort all") — removed per explicit user request
  across every place it appeared.

- **Adding or renaming a mapping into a description that's already mapped
  throws a friendly error instead of a raw Postgres one.**
  `mapped_descriptions`' primary key is `(user_id, description)`, so a
  collision surfaces as a `23505` (unique_violation) from the `.insert()`
  in `addMappedDescription` or the `.update()` in `updateMappedDescription`
  (the latter when the *edited* description now matches a different
  existing row). Both go through a local `throwFriendlyError(message,
  code)` in `descriptions/actions.ts` — same pattern as
  `categories/actions.ts`'s own copy for category-name collisions, not
  shared code, just the same shape — that turns a `23505` into "A mapping
  for this description already exists." Both `AddMappingDialog` and
  `DescriptionsTable`'s edit dialog already had an error paragraph wired up
  from the CLAUDE.md-documented Edit/Add dialog error-state convention, so
  no UI changes were needed to surface it — only the action layer changed.

- **`AddMappingDialog` (`src/app/descriptions/add-mapping-dialog.tsx`) is
  controllable from outside the Descriptions page**, not just a
  self-contained `DialogTrigger`-wrapped dialog. It takes optional
  `open`/`onOpenChange` (falls back to its own internal `useState` when
  omitted — the normal Descriptions-page usage), `defaultDescription` (the
  Input's `defaultValue`), `defaultCategoryId`/`defaultClassId` (initial
  values for the Category/Class `Select`s, else both start unset), and
  `showTrigger` (set `false` to suppress its own "+" `DialogTrigger` when
  something else is opening it). The external callers are Search's
  edit dialog's "Save and map description" button (`search/search-table.tsx`)
  and the Dashboard's embedded transactions table's identical button
  (`dashboard-transactions-table.tsx` — a separate copy of the same edit
  dialog, see `dashboard-conventions`; the two are kept in sync by hand, not
  by sharing code): each saves the row like the normal "Save" button (same
  `updateTransaction` call, same `startSaveEdit` transition), then reads the
  *saved* description straight off the just-submitted `FormData`
  (`.trim().toLowerCase()`, matching what `updateTransaction` itself just
  persisted) into a `mappingPrefill` state, which conditionally mounts a
  controlled `AddMappingDialog` with `showTrigger={false}`,
  `defaultDescription={mappingPrefill}`, and `defaultCategoryId`/
  `defaultClassId` set from the edit dialog's own `editCategoryId`/
  `editClassId` state (not reset until the next row is opened for editing,
  so at this point it still holds exactly what was selected/submitted) — a
  full remount each time (guarded by `{mappingPrefill !== null && ...}`, the
  same pattern the edit dialog itself uses), so the dialog's `categoryId`/
  `classId` state seeds fresh from those defaults on every open. Operator is
  left for the user to choose, same as a normal new mapping. The dialog's
  own `"Create and sort unmapped"` button (next to `"Create"`) calls
  `addMappedDescription` then `syncMappedDescriptions()` in one click,
  reading the form via a `ref` (not the native submit-button/FormData
  trick) since it needs to run a second async step after creating —
  `"Create"` alone is untouched, still just the plain `action={...}` form
  submission it always was.
  **Why no "Create and sort all" button:** there used to be a third button
  here too, matching the removed "sort all" action above — removed per
  explicit user request; don't re-add it without a fresh ask.

- **`DescriptionsTable`'s own edit-mapping dialog** (same file,
  `src/app/descriptions/descriptions-table.tsx` — a plain inline `Dialog`,
  not `AddMappingDialog`) has a matching `"Sort unmapped"` button next to
  `"Save"`, wired the same `ref`-read-`FormData` way but calling
  `updateMappedDescription` instead of `addMappedDescription` — so editing
  an existing mapping's description/operator/category/class can immediately
  re-run it against transactions too, not just creating a new one.
  `"Save"` alone still means "persist the edit, don't touch any
  transactions." **The button label is `"Sort unmapped"` here, not
  `"Create and sort unmapped"`** — editing isn't creating, so the label
  shouldn't claim it is.
  **Why:** an earlier explicit user request briefly made this match
  `AddMappingDialog`'s wording exactly, then a later explicit request
  reversed that. This dialog also used to have a `"Sort all"` button next
  to this one — removed per explicit user request, same as above.
