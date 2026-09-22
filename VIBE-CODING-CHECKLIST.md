# Vibe Coding Checklist — finances-app

Personal notes on good vibe-coding practice, written after a review of this
repo on 2026-09-15. Keep this file updated as items get closed out — treat
it like `PITFALLS.md`'s sibling: not a rulebook, a running record.

## Already doing well (keep it up)

- [x] `CLAUDE.md` / `AGENTS.md` / `PITFALLS.md` carry stack facts and known
      bugs forward instead of re-explaining them every session.
- [x] `.claude/skills/` splits narrow, task-shaped conventions (table
      layout, amount colors, description rules) out of `CLAUDE.md` so they
      load only when relevant.
- [x] Every table has RLS scoped to `auth.uid() = user_id`, *and* every
      server action still double-checks `if (!user) throw ...` and filters
      by `user_id` explicitly — defense in depth, not just RLS alone.
- [x] `.env.local` is gitignored and has never been committed (verified via
      `git log --all --full-history -- .env.local`).
- [x] No stray `console.log`, no `any` types, no TODO/FIXME litter,
      TypeScript `strict: true`.
- [x] Git history is small, honest, descriptive commits — not giant "stuff"
      commits.

## To close out

**Testing**

- [ ] Add a handful of tests around the Pluggy sync logic in
      `src/app/accounts/pluggy-actions.ts` — the credit-card balance
      negation (`-Math.abs(...)`), the pending-transaction date cutoff, and
      the stale-transaction dedup/delete loop. This is exactly the kind of
      silent-failure math a refactor can break without showing up in a
      diff.
- [ ] Add a test for the budget-vs-actual calculation once it's not a
      one-off — money math bugs don't announce themselves.

**Input validation**

- [ ] Introduce a schema validation library (zod is the natural fit here)
      for the transaction and budget forms. Right now `FormData` values are
      cast with `as string` and checked manually
      (`if (!account_id || !dateInput...) return`) — invalid input just
      silently no-ops instead of telling the user what's wrong.
- [ ] Audit other `as string` casts in `src/app/*/actions.ts` for the same
      pattern.

**Git hygiene**

- [ ] Add a `.gitattributes` with `* text=auto eol=lf`. Right now `git
      status` shows every tracked file as modified (confirmed: `git diff`
      on `package.json` shows every line removed and re-added — a
      line-ending rewrite, not real changes). This matters more for vibe
      coding than normal dev, since it kills your ability to glance at
      `git status`/`git diff` and see what the AI actually touched before
      committing.

**Migrations & deploy safety**

- [ ] Consider wiring up the Supabase CLI (`supabase db push`) instead of
      applying `supabase/migrations/*.sql` by hand in the SQL editor — right
      now nothing enforces that the repo's migration files match what's
      actually running in production.
- [ ] Add a GitHub Action that runs `npm run lint` and `npm run build` on
      push/PR. Currently every push to `main` auto-deploys via Vercel with
      no build gate — fine solo, risky once a broken build can reach a live
      finance app.
- [ ] Consider routing riskier changes (migrations, Pluggy sync logic)
      through a PR instead of pushing straight to `main`, just to get one
      forced look at the diff before it goes live.

**Small robustness fix**

- [ ] Replace the non-null assertions on env vars
      (`process.env.NEXT_PUBLIC_SUPABASE_URL!`) with a small startup check
      that throws a clear "missing env var X" error instead of a cryptic
      runtime crash if Vercel's env config ever drifts.

## Meta habit

The `PITFALLS.md` + Skills pattern works because it's fed *after* catching
a mistake, not before. Keep doing that: whenever Claude Code repeats a
mistake or you correct its output, write the rule down immediately rather
than trusting it'll remember. And for money math specifically — sign
flips, rounding, date-boundary logic — read the generated code yourself
before merging. Clean-looking code and correct financial arithmetic are
independent properties; this repo already proved that once with the
1000-row Supabase cap.
