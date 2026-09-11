---
name: table-page-conventions
description: Use when adding a new list-style page or touching an existing one (Transactions, Categories, Classes, Descriptions, Accounts) — table markup, row selection, the toolbar (Sync/Edit/Add/Delete), column show/hide & reorder, sorting, add/edit dialogs, category/class chip rendering, or bulk mutations. Encodes this app's shared list-page architecture so new pages match instead of inventing a fresh layout.
---

# Table page conventions

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
  one row is checked). **Per-row checkboxes are hidden until hovered or
  checked** — the header's select-all `Checkbox` stays always visible, but
  each body row's own `Checkbox` gets `className="opacity-0
  transition-opacity group-hover:opacity-100 focus-visible:opacity-100
  data-[checked]:opacity-100"`, and its `<TableRow>` gets `className="group"`
  so `group-hover` has something to key off. `data-[checked]` (not
  `data-state`) is Base UI's own attribute for a checked `Checkbox` (see
  `src/components/ui/checkbox.tsx`) — that's what keeps a selected row's
  checkbox visible after the mouse moves away.
- **Row actions live in a toolbar above the table, not a per-row menu.**
  Right-aligned button group: `ColumnsMenu` first, then any page-specific
  bulk actions (Accounts' and Transactions' "Sync" — icon-only
  `RefreshCwIcon`, `variant="outline"` `size="icon-sm"`, spinning via
  `className={isSyncing ? "animate-spin" : undefined}` while pending), then
  "Edit" (icon-only `PencilIcon`, same `outline`/`icon-sm` styling; disabled
  unless `soleSelectedRow` is set; opens a dialog scoped to that one row),
  then the page's "Add" dialog trigger (see below), then "Delete" — now also
  icon-only (`Trash2Icon`, `variant="ghost"` `size="icon-sm"`, no red
  fill/destructive styling; disabled when nothing's selected; confirms via
  `window.confirm(...)` before calling a bulk delete action). "+" sits
  immediately to the left of "Delete" on every table page. Icon-only
  toolbar buttons need `aria-label` *and* `title` set to the plain action
  word ("Sync", "Edit", "Delete") for the same reason "Add" buttons do (see
  below). A left-aligned
  `{selected.size > 0 && <span>{selected.size} selected</span>}` fills the
  other side of the toolbar — render nothing (not a filler placeholder
  string) when nothing's selected. The edit dialog is a plain
  `Dialog`/`DialogContent` (no `DialogTrigger`) whose `open` state is local,
  opened by the toolbar Edit button's `onClick`; guard its render on
  `soleSelectedRow` (`{soleSelectedRow && <Dialog ...>}`) so it has data to
  prefill from and unmounts cleanly once the dialog closes.
  **The toolbar (and thus "+") must render even when the row list is
  empty** — the empty-state message (`"No categories yet."` etc.) replaces
  only the `<Table>` markup via a ternary, never the surrounding toolbar, so
  "+" stays reachable from a zero-row page instead of being stranded behind
  an early return.
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
  the accessible name and the hover tooltip must carry it. The `Add*Dialog`
  component itself is rendered from inside the `<X>Table` client component's
  toolbar (immediately before "Delete"), not from the server `page.tsx`
  header — `page.tsx` keeps only the `<h1>` and any page-level, non-row
  controls (Accounts' `ConnectBankButton`, Descriptions' `SyncButton`,
  Transactions' month nav). Classes and Descriptions render their `Add*Dialog`
  unconditionally inside the table (safe because `page.tsx` only mounts the
  table when categories exist); Transactions swaps its "+" for a "Create an
  account first" link button when `accounts.length === 0`, using the same
  `accounts` prop the table already receives.
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
  **Category-as-foreign-column is icon-only, no name, no `Badge`, and
  center-aligned.** Classes', Descriptions', and Transactions' `renderCell`
  "category" case each render just `<span title={category.name}><CategoryIcon
  icon={category.icon} className="size-4" /></span>` — a bare icon with the
  name only as a hover tooltip, not a chip. Its `COLUMNS` entry sets
  `align: "center", cellClassName: "text-center"` (widen each file's
  `COLUMNS` `align` field type to include `"center"` if it doesn't already,
  and pass `align={column.align}` through to `SortableTableHead` — Classes
  and Descriptions didn't wire that prop through at all until this column
  needed it) so the icon sits centered under the header rather than
  left-aligned like a text column. This is different from the
  Categories table's own Name column and Budget's category rows
  (`yearly-grid.tsx`, `monthly-execution.tsx`), which still show the icon
  *next to* the visible name (no `Badge` there either, but the name stays
  on the page) since those are the category's own row, not a foreign-key
  reference to it. Transactions' Account and Class columns (which have no
  icon of their own) instead use a `Badge` (`variant="secondary"
  className="max-w-full gap-1 truncate"`, no leading icon) — see
  `transactions-column-formatting`. The Dashboard's
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
