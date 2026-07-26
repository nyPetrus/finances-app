@AGENTS.md

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
