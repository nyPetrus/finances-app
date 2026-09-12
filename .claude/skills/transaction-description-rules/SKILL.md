---
name: transaction-description-rules
description: Use when writing or touching code that inserts/updates a transaction's description, or that bulk-categorizes transactions from history (src/app/transactions/actions.ts, src/app/accounts/pluggy-actions.ts, src/app/descriptions/actions.ts) — covers the mandatory lowercase-description rule, the difference between the two bulk-categorization actions, and the "Save and sync description" edit-to-mapping handoff.
---

# Transaction description rules

- **`transactions.description` is always stored lowercase.** Enforced in
  `src/app/transactions/actions.ts` (manual add/edit) and
  `src/app/accounts/pluggy-actions.ts` (Pluggy sync) — any new path that
  inserts or updates a transaction's description must lowercase it first.
  Existing rows were backfilled once via
  `supabase/migrations/0012_lowercase_transaction_descriptions.sql`.

- **Two ways to bulk-categorize uncategorized transactions from history**,
  both in `src/app/descriptions/actions.ts`: `syncMappedDescriptions()` (the
  Descriptions page's "Sync" button) applies the *existing*
  `mapped_descriptions` rules — `equal_to` beats `starts_with` beats
  `contains`, longest pattern wins within a tier — to every transaction
  with `category_id is null`. `autoCategorizeFromHistory()` (the
  "Auto-categorize from history" sparkles button next to it) goes one step
  further: for every description that appears on an already-categorized
  transaction but has *no* explicit mapping yet, it infers one (the
  majority category/class combo for that exact description, `equal_to`
  only) via an upsert keyed on the `(user_id, description)` primary key,
  then calls `syncMappedDescriptions()` to apply the combined rule set. It
  never overwrites a description that already has an explicit mapping, even
  a `starts_with`/`contains` one that hasn't matched anything yet.

- **`AddMappingDialog` (`src/app/descriptions/add-mapping-dialog.tsx`) is
  controllable from outside the Descriptions page**, not just a
  self-contained `DialogTrigger`-wrapped dialog. It takes optional
  `open`/`onOpenChange` (falls back to its own internal `useState` when
  omitted — the normal Descriptions-page usage), `defaultDescription` (the
  Input's `defaultValue`), and `showTrigger` (set `false` to suppress its
  own "+" `DialogTrigger` when something else is opening it). The only
  external caller is Transactions' edit dialog's "Save and sync
  description" button (`transactions-table.tsx`): it saves the row like
  the normal "Save" button (same `updateTransaction` call, same
  `startSaveEdit` transition), then reads the *saved* description straight
  off the just-submitted `FormData` (`.trim().toLowerCase()`, matching
  what `updateTransaction` itself just persisted) into a `mappingPrefill`
  state, which conditionally mounts a controlled `AddMappingDialog` with
  `showTrigger={false}` and `defaultDescription={mappingPrefill}` — a full
  remount each time (guarded by `{mappingPrefill !== null && ...}`, the
  same pattern the edit dialog itself uses), so `defaultValue` and the
  dialog's own `categoryId`/`classId` state always start fresh. Only the
  Description field is prefilled; Operator/Category/Class are left for the
  user to choose in the opened dialog, same as a normal new mapping. The
  dialog's own `"Create and sync"` button (next to `"Create"`) calls
  `addMappedDescription` then `syncMappedDescriptions()` in one click,
  reading the form via a `ref` (not the native submit-button/FormData
  trick) since it needs to run a second async step after creating —
  `"Create"` alone is untouched, still just the plain `action={...}` form
  submission it always was.
