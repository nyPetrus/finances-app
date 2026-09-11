@AGENTS.md
@PITFALLS.md

# Project notes

Personal finance & budget app. Stack: Next.js 16 (App Router) + TypeScript +
Tailwind v4 + shadcn/ui, Supabase (Postgres + Auth, RLS per user), Pluggy
(Open Finance aggregator for Nubank/XP sync).

- **Next.js 16 renamed `middleware.ts` to `proxy.ts`.** This project's is at
  `src/proxy.ts` — it refreshes the Supabase session and redirects
  unauthenticated requests to `/login`.
- **shadcn/ui here is built on Base UI, not Radix.** Composing a trigger with
  a custom element uses `render={<Button />}`, not `asChild`. E.g.
  `<DialogTrigger render={<Button />}>Open</DialogTrigger>`.
- Database schema lives in `supabase/migrations/*.sql`, applied manually via
  the Supabase SQL Editor (no CLI link set up) — when adding a migration,
  tell the user to run the new file there.
- `.env.local` (gitignored) holds `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `PLUGGY_CLIENT_ID`,
  `PLUGGY_CLIENT_SECRET`. Same values are set in Vercel's project env vars
  for production.
- Deployed on Vercel, auto-deploys on push to `main`
  (https://github.com/nyPetrus/finances-app). Live at
  https://finances-app-two-zeta.vercel.app.
- **Body font is Inter** (`src/app/layout.tsx`, loaded via `next/font/google`
  as `--font-inter`, wired to Tailwind's `--font-sans` in `globals.css`),
  chosen for a numbers-heavy app because of its legibility at small sizes and
  true tabular figures. `Geist_Mono` is still used for `--font-mono`. The
  `body` rule in `globals.css` applies Tailwind's `tabular-nums` globally so
  digits always align in columns — don't remove it, and don't override it
  with `proportional-nums` in a table/dashboard context.

## Skills

A few narrower, task-shaped conventions live in Skills
(`.claude/skills/`) instead of here, so they load only when the task at
hand actually touches them rather than on every request:

- `table-page-conventions` — the shared list-page architecture (markup, row
  selection, toolbar, column show/hide & reorder, sorting, add/edit
  dialogs, category/class chip rendering, bulk mutations) that Transactions,
  Categories, Classes, Descriptions, and Accounts all follow. Load this
  before adding a new list page or changing an existing one's table
  structure.
- `amount-color-conventions` — the income/expense color rule for raw
  amounts, distinct from Budget's planned-vs-actual variance colors.
- `transaction-description-rules` — the mandatory lowercase-description
  rule and the difference between the two bulk-categorization actions in
  `src/app/descriptions/actions.ts`.
