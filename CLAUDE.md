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
- **`transactions.description` is always stored lowercase.** Enforced in
  `src/app/transactions/actions.ts` (manual add/edit) and
  `src/app/accounts/pluggy-actions.ts` (Pluggy sync) — any new path that
  inserts or updates a transaction's description must lowercase it first.
  Existing rows were backfilled once via
  `supabase/migrations/0012_lowercase_transaction_descriptions.sql`.
- **Negative/expense amounts don't get a special color — only positive
  (income) amounts do.** A positive amount is `text-emerald-600`; a negative
  one just uses the default text color (no class, or explicitly omit the
  color class rather than adding `text-foreground`). Transfers stay
  `text-muted-foreground` regardless of sign. Applies everywhere a raw
  income/expense amount is displayed: the Transactions table's Amount
  column (`transactions-table.tsx`), the month header's income/expense
  summary (`transactions/page.tsx`), and the Dashboard's Expenses card
  (`src/app/page.tsx`) — the Dashboard's Income card keeps its green. This
  is distinct from Budget's planned-vs-actual variance column
  (`monthly-execution.tsx`), which is a different concept (over/under
  budget, not income vs. expense) and keeps its own red/green pair; don't
  conflate the two when touching either.

## Table page conventions

All list-style pages (Transactions, Categories, Classes, Descriptions,
Accounts) follow the same structure: a server `page.tsx` that fetches and
sorts the rows, handing them to a client `<X>Table` component
(`accounts-table.tsx`, `categories-table.tsx`, `classes-table.tsx`,
`descriptions-table.tsx`, `transactions-table.tsx`) that owns selection,
column preferences, and all row interaction. Match this when adding a new
list page instead of inventing a fresh layout.

- **Markup**: shadcn's `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableCell`
  from `@/components/ui/table`, in **auto layout — no `table-fixed` or
  `<colgroup>`** (columns can be hidden/reordered at runtime, so fixed
  percentage widths don't work; let the browser size columns to content). The
  leading column is always an unlabeled `<TableHead className="w-0" />`
  holding a select-all `Checkbox`. Default to one flat, sortable table rather
  than grouped sections.
- **Row selection**: `useRowSelection` (`src/hooks/use-row-selection.ts`) —
  call it with the page's row array and a `getId` function (usually
  `(row) => row.id`; Descriptions keys on `(row) => row.description` since
  `mapped_descriptions`' primary key is `(user_id, description)`, no `id`
  column). It returns `selected`, `allSelected`/`someSelected` (for the
  header checkbox's `checked`/`indeterminate`), `toggleAll`/`toggleOne`,
  `clear`, `selectedRows`, and `soleSelectedRow` (non-null only when exactly
  one row is checked).
- **Row actions live in a toolbar above the table, not a per-row menu.**
  Right-aligned button group: `ColumnsMenu` first, then any page-specific
  bulk actions (Accounts' and Transactions' "Sync" — icon-only
  `RefreshCwIcon`, `variant="outline"` `size="icon-sm"`, spinning via
  `className={isSyncing ? "animate-spin" : undefined}` while pending), then
  "Edit" (icon-only `PencilIcon`, same `outline`/`icon-sm` styling; disabled
  unless `soleSelectedRow` is set; opens a dialog scoped to that one row),
  then "Delete" — the one toolbar button that stays text-labeled, since
  "Delete" alone has no ambiguous icon equivalent (`variant="ghost"`, no red
  fill/destructive styling; disabled when nothing's selected; confirms via
  `window.confirm(...)` before calling a bulk delete action). Icon-only
  toolbar buttons need `aria-label` *and* `title` set to the plain action
  word ("Sync", "Edit") for the same reason "Add" buttons do (see below). A
  left-aligned
  `{selected.size > 0 && <span>{selected.size} selected</span>}` fills the
  other side of the toolbar — render nothing (not a filler placeholder
  string) when nothing's selected. The edit dialog is a plain
  `Dialog`/`DialogContent` (no `DialogTrigger`) whose `open` state is local,
  opened by the toolbar Edit button's `onClick`; guard its render on
  `soleSelectedRow` (`{soleSelectedRow && <Dialog ...>}`) so it has data to
  prefill from and unmounts cleanly once the dialog closes.
- **Column show/hide + reorder**: `useColumnPreferences<SortKey>(storageKey,
  defaultOrder)` (`src/hooks/use-column-preferences.ts`) persists both to
  localStorage under `${storageKey}-hidden-columns` /
  `${storageKey}-column-order` (pick a `storageKey` unique per table, e.g.
  `"transactions-table"`) and reconciles a stored order against the current
  column set on load, so adding/removing a column later doesn't strand it.
  Render the `ColumnsMenu` component (`src/components/columns-menu.tsx`) in
  the toolbar, passing it the page's `COLUMNS` config and the hook's
  `order`/`hidden`/`toggle`/`move`. Each page defines `COLUMNS` as an array
  of `{ key: SortKey; label: string; align?; cellClassName? }` and a
  `renderCell(row, key)` switch, then maps `visibleColumns` (`order`, minus
  `hidden`) to both the header row (`SortableTableHead`s) and each body row's
  cells — this keeps the header and cell counts from ever desyncing.
- **Sorting**: still via the shared `SortableTableHead` component
  (`src/components/sortable-table-head.tsx`, `align` is `"left" | "right" |
  "center"`). Each page keeps its own `sort.ts` exporting `SORT_KEYS as
  const`, `SortKey`, and `isSortKey`, imported by both `page.tsx` (to parse
  `searchParams`) and the `<X>Table` client component. The actual row order
  is still computed server-side in `page.tsx` with a `switch (sortKey)`
  before the sorted array is passed down — don't rely on the DB query's
  `.order()`. `sortHref(column)` is rebuilt locally inside the client table
  component (not passed down as a prop — functions aren't serializable
  across the server/client boundary), since header cells now render
  client-side to respect column order/visibility; it must preserve any
  page-level filters in the URL (Transactions' `month`/`account`).
- **"Add" buttons are icon-only**, a `PlusIcon` (`lucide-react`) with no
  label text and `variant="ghost"` — e.g. `AddAccountDialog`'s
  `DialogTrigger` renders `<Button variant="ghost" size="icon"
  aria-label="Add account" title="Add account"><PlusIcon /></Button>`
  instead of a filled button reading "Add account". `ghost` (no background
  fill) is the standard for every "+" trigger across the app — Accounts set
  the precedent, the rest were brought in line with it. Always pair the icon
  with `aria-label` *and* `title` set to the same descriptive text ("Add
  account", "Add category", ...) — the icon alone doesn't convey which row
  type it adds, and dropping the label removes the only other cue, so both
  the accessible name and the hover tooltip must carry it.
- **Edit/Add dialogs**: `Label` + `Input`/`Select` fields per `@/components/ui`.
  Add dialogs (still a standalone `DialogTrigger`-wrapped `Dialog`, e.g.
  `AddAccountDialog`) keep their own local `error` state, shown as
  `{error && <p className="text-sm text-destructive">{error}</p>}` above the
  footer. Edit dialogs, now part of the toolbar-selection flow, share the
  table's single `actionError` state instead (also used by Delete/Sync/etc.)
  — don't duplicate the error paragraph inside the dialog too; the outer one
  stays visible (dimmed) behind the modal backdrop. Server actions should
  throw `Error`s with user-facing messages (see the unique-name violation
  handling in `src/app/categories/actions.ts`).
- **Categories are identified by an icon, not a color.** `categories.icon`
  (text) stores a key into `CATEGORY_ICON_MAP`
  (`src/lib/category-icons.ts`), a curated set of `lucide-react` icons picked
  to fit common finance categories (groceries, transport, salary, etc.),
  with `"tag"` as both the last palette entry and the fallback for an
  unrecognized/missing key. Categories used to carry a `color` field instead
  — that column was dropped (see
  `supabase/migrations/0015_categories_icon.sql`, which also re-seeds the
  on-signup default categories with fitting icons) and nothing should
  reintroduce per-category color. Render the icon with the shared
  `<CategoryIcon icon={category.icon} className="..." />`
  (`src/components/category-icon.tsx`) rather than looking up
  `CATEGORY_ICON_MAP` directly, so the fallback stays centralized. Add/Edit
  Category dialogs let the user pick one via `<IconSwatchPicker name="icon"
  value={icon} onChange={setIcon} />` (`src/components/icon-swatch-picker.tsx`),
  the same swap-a-button-grid pattern the old `ColorSwatchPicker` used.
  **Category/class chips**: render with `Badge` (`variant="secondary"`, now
  a flat neutral style with no per-category tint) with `<CategoryIcon>` as a
  leading child before the name — see Classes/Descriptions/Transactions'
  `renderCell` "category" case. The Categories table's own Name column and
  Budget's category rows (`yearly-grid.tsx`, `monthly-execution.tsx`) show
  the same icon next to the name, without a Badge wrapper. The Dashboard's
  "Spending by category" bar chart still needs a real fill color per bar
  (icons don't work as a chart fill) — it assigns one from `CHART_COLORS`
  (`src/lib/chart-colors.ts`) by bar position, entirely decoupled from
  categories; don't wire that back to a per-category property.
- **Mutations**: bulk actions take an array (`deleteAccounts(ids: string[])`,
  `deleteMappedDescriptions(descriptions: string[])`, etc.) and delete/update
  via `.in(...)`, guarded by `.eq("user_id", user.id)` like every other
  action. Server actions call `revalidatePath` for every page that displays
  the changed data (a category edit revalidates `/categories` *and*
  `/transactions`, for instance) — check for cross-page dependencies before
  assuming one path is enough. A bulk action shouldn't touch `updated_at` if
  that column is read elsewhere as a meaningful timestamp (e.g. Accounts'
  "Last sync" column reads it as "last synced" for automatic accounts —
  relabeling one via the Edit dialog must not bump it).
