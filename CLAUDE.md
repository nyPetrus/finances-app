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
- **Body font is Inter** (`src/app/layout.tsx`, loaded via `next/font/google`
  as `--font-inter`, wired to Tailwind's `--font-sans` in `globals.css`),
  chosen for a numbers-heavy app because of its legibility at small sizes and
  true tabular figures. `Geist_Mono` is still used for `--font-mono`. The
  `body` rule in `globals.css` applies Tailwind's `tabular-nums` globally so
  digits always align in columns — don't remove it, and don't override it
  with `proportional-nums` in a table/dashboard context.
- **`transactions.description` is always stored lowercase.** Enforced in
  `src/app/transactions/actions.ts` (manual add/edit) and
  `src/app/accounts/pluggy-actions.ts` (Pluggy sync) — any new path that
  inserts or updates a transaction's description must lowercase it first.
  Existing rows were backfilled once via
  `supabase/migrations/0012_lowercase_transaction_descriptions.sql`.

## Table page conventions

All list-style pages (Transactions, Categories, Classes, Descriptions,
Accounts) follow the same structure. Match this when adding a new one
instead of inventing a fresh layout.

- **Markup**: shadcn's `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableCell`
  from `@/components/ui/table`. Use `<Table className="table-fixed">` with an
  explicit `<colgroup>` of percentage widths that sum to 100; give the
  trailing actions column a narrow, unlabeled `<TableHead className="w-0" />`.
  Default to one flat, sortable table rather than grouped sections (e.g.
  Categories and Classes used to be grouped `<ul>` lists by kind/category —
  they were flattened into sortable tables for consistency).
- **Sorting**: every column header is sortable via the shared
  `SortableTableHead` component (`src/components/sortable-table-head.tsx`).
  Each page defines its own `SORT_KEYS as const` tuple + `SortKey` type +
  `isSortKey` guard, reads `sort`/`dir` out of `searchParams`, derives
  `sortKey`/`sortDir` with a sensible default, and builds each header's link
  with a local `sortHref(column)` helper (flips direction if the column is
  already active, otherwise starts at `"asc"`). Sort the fetched rows in JS
  with a `switch (sortKey)` before rendering — don't rely on the DB query's
  `.order()` for the display order.
- **Row actions**: a single dropdown menu, not separate inline buttons.
  Trigger is `<DropdownMenuTrigger render={<Button variant="ghost"
  size="icon-sm" />}><EllipsisIcon /></DropdownMenuTrigger>`, content holds
  `DropdownMenuItem`s ("Edit", "Delete" with `variant="destructive"`, plus
  anything else the row needs — e.g. Accounts' "Sync", Transactions' "Hide").
  The edit dialog is *not* wrapped in a `DialogTrigger`; it's a plain
  `Dialog`/`DialogContent` whose `open` state is local, opened by the "Edit"
  item's `onClick`, so it can share the menu's trigger button. Delete goes
  through a `window.confirm(...)` before calling the delete server action.
- **Edit/Add dialogs**: `Label` + `Input`/`Select` fields per `@/components/ui`.
  Wrap the server action call in the form's `action` in try/catch, store the
  message in local `error` state, and render it as
  `{error && <p className="text-sm text-destructive">{error}</p>}` above the
  footer — server actions should throw `Error`s with user-facing messages
  (see e.g. the unique-name violation handling in
  `src/app/categories/actions.ts`).
- **Category/class chips**: render with `Badge` (`variant="secondary"`),
  colored via `style={{ backgroundColor: \`${color}22\`, color }}` using the
  category's own `color` field.
- **Mutations**: server actions call `revalidatePath` for every page that
  displays the changed data (a category edit revalidates `/categories` *and*
  `/transactions`, for instance) — check for cross-page dependencies before
  assuming one path is enough.
