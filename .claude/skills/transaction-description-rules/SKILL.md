---
name: transaction-description-rules
description: Use when writing or touching code that inserts/updates a transaction's description, or that bulk-categorizes transactions from history (src/app/transactions/actions.ts, src/app/accounts/pluggy-actions.ts, src/app/descriptions/actions.ts) — covers the mandatory lowercase-description rule, the difference between the bulk-categorization actions, and the "Save and map description" edit-to-mapping handoff.
---

# Transaction description rules

- **`transactions.description` is always stored lowercase.** Enforced in
  `src/app/transactions/actions.ts` (manual add/edit) and
  `src/app/accounts/pluggy-actions.ts` (Pluggy sync) — any new path that
  inserts or updates a transaction's description must lowercase it first.
  Existing rows were backfilled once via
  `supabase/migrations/0012_lowercase_transaction_descriptions.sql`.

- **Two ways to bulk-categorize transactions from history**, both in
  `src/app/descriptions/actions.ts`, sharing a private `applyMappingSet()`
  matcher (`equal_to` beats `starts_with` beats `contains`, longest pattern
  wins within a tier, each transaction claimed by at most one mapping):
  `syncMappedDescriptions()` (the "Sync" button in `DescriptionsTable`'s own
  toolbar — see `table-page-conventions` — and the "Create and sort
  unmapped" button in both `AddMappingDialog` and `DescriptionsTable`'s own
  edit-mapping dialog) applies the *existing* `mapped_descriptions` rules to
  every transaction with `category_id is null`. `syncAllMappedDescriptions()`
  (the "Create and sort all" button in those same two places) applies them
  to *every* transaction regardless of current `category_id`, so a mapping
  can override a transaction's existing category/class — because it isn't
  narrowed to a query that's guaranteed under Supabase/PostgREST's 1000-row
  cap the way the uncategorized-only query is, it pages through `.range()`
  instead of a single `.select()` (see `PITFALLS.md`).

- **`AddMappingDialog` (`src/app/descriptions/add-mapping-dialog.tsx`) is
  controllable from outside the Descriptions page**, not just a
  self-contained `DialogTrigger`-wrapped dialog. It takes optional
  `open`/`onOpenChange` (falls back to its own internal `useState` when
  omitted — the normal Descriptions-page usage), `defaultDescription` (the
  Input's `defaultValue`), `defaultCategoryId`/`defaultClassId` (initial
  values for the Category/Class `Select`s, else both start unset), and
  `showTrigger` (set `false` to suppress its own "+" `DialogTrigger` when
  something else is opening it). The external callers are Transactions'
  edit dialog's "Save and map description" button (`transactions-table.tsx`)
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
  own `"Create and sort unmapped"` and `"Create and sort all"` buttons (next
  to `"Create"`) call `addMappedDescription` then `syncMappedDescriptions()`
  / `syncAllMappedDescriptions()` respectively in one click, reading the
  form via a `ref` (not the native submit-button/FormData trick) since each
  needs to run a second async step after creating — `"Create"` alone is
  untouched, still just the plain `action={...}` form submission it always
  was.

- **`DescriptionsTable`'s own edit-mapping dialog** (same file,
  `src/app/descriptions/descriptions-table.tsx` — a plain inline `Dialog`,
  not `AddMappingDialog`) has the identical pair of buttons next to `"Save"`,
  wired the same `ref`-read-`FormData` way but calling
  `updateMappedDescription` instead of `addMappedDescription` — so editing
  an existing mapping's description/operator/category/class can immediately
  re-run it against transactions too, not just creating a new one. The
  button labels stay `"Create and sort unmapped"` / `"Create and sort all"`
  even here (an edit, not a create) to match `AddMappingDialog`'s wording
  exactly, per explicit user request.
