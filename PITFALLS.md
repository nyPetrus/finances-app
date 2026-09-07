# Known pitfalls

Recurring mistakes this project has actually hit, kept here so they don't
happen a third time.

## Supabase/PostgREST silently caps queries at 1000 rows

PostgREST (what Supabase's REST API runs on) defaults to a **1000-row cap**
on any `select`, applied even when the code has no `.limit()` at all. There
is no error and no warning — a query that should return, say, 1500 rows
just quietly comes back with (up to) 1000 of them.

This has bitten this app twice:

1. **Transactions page** used to fetch with an explicit `.limit(200)`, which
   cut off older history once an account passed 200 transactions. Fixed by
   removing the limit — safe there because that page always scopes to a
   single month, which stays well under 1000 rows.
2. **Dashboard and Budget page** each ran an unbounded, unordered
   `.select("*")` over a full year of transactions. Once a year's
   transaction count crossed 1000 (this account has 1500+/year from Pluggy
   sync), Supabase silently returned an arbitrary subset with no
   `.order()` to make the omissions predictable — which happened to drop
   January, February, and March entirely while later months looked fine.
   Fixed by adding `fetchAllTransactionsInRange`
   (`src/lib/supabase/fetch-all-transactions.ts`), which pages through
   results with `.range()` in batches of 1000 until a page comes back
   short. `src/app/accounts/pluggy-actions.ts` already used the same
   paging technique for its own >1000-row existing-ids lookup, for the
   same reason.

**Rule going forward**: any query that isn't already scoped narrowly
enough to *guarantee* it stays well under 1000 rows (a single month, a
single account's config rows, etc.) must either page through results with
`.range()` — see `fetchAllTransactionsInRange` for the pattern — or have a
deliberate, explicit `.limit()` where truncation is actually the intended
behavior. Never assume a plain `.select("*")` returns everything.
