---
name: transaction-description-rules
description: Use when writing or touching code that inserts/updates a transaction's description, or that bulk-categorizes transactions from history (src/app/transactions/actions.ts, src/app/accounts/pluggy-actions.ts, src/app/descriptions/actions.ts) — covers the mandatory lowercase-description rule and the difference between the two bulk-categorization actions.
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
