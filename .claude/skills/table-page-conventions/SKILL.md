---
name: table-page-conventions
description: Use when adding a new list-style page or touching an existing one (Transactions, Categories, Classes, Descriptions, Accounts) — table markup, row selection, the two-zone toolbar (generic Columns/Add/Delete vs. table-specific buttons), the per-row "⋮" actions menu (Edit/Sync/Delete), column show/hide & reorder, column header icons, sorting, add/edit dialogs, category/class chip rendering, or bulk mutations. Encodes this app's shared list-page architecture so new pages match instead of inventing a fresh layout.
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
- **A column's `cellClassName: "truncate"` must always be paired with a
  `max-w-*` on that same cell, or it silently does nothing.** This app's
  tables use the default (`auto`) HTML table layout, not `table-fixed` (see
  the `Markup` bullet above — fixed widths/`<colgroup>` aren't allowed since
  columns can be hidden/reordered). In `auto` layout, `white-space: nowrap`
  (part of what Tailwind's `truncate` sets, alongside `overflow-hidden` and
  `text-overflow: ellipsis`) makes a cell's *min-content* width equal its
  full, un-ellipsized width — so the browser never actually gets to shrink
  that column enough to trigger the ellipsis; it just grows the table (and
  the `overflow-auto` container around it) wider instead, which reintroduces
  the horizontal scroll `truncate` was supposed to prevent in the first
  place. An explicit `max-w-*` on the cell caps how wide the column is
  *allowed* to grow, which is what actually gives `truncate` something to
  clip against. The table still lets the column render wider than that cap
  when there's slack (e.g. every value on screen happens to be short) —
  `max-w-*` only participates as an upper bound in the layout algorithm, not
  a fixed width, so short values aren't cropped unnecessarily. If a column
  wraps a value in a `Badge` (see the "Category-as-foreign-column" bullet
  below and `transactions-column-formatting`) the `max-w-*` still has to go
  on the **cell**, not just the `Badge` — the `Badge`'s own `max-w-full` is
  relative to its parent, so without a capped parent it's still an
  unbounded 100%. If a cell wraps its content in a flex row (icon + text,
  e.g. Categories' Name column) the truncating child also needs `min-w-0`
  alongside `truncate` — flex items default to `min-width: auto`, which for
  a `nowrap` child is again its full content width, the same underlying
  problem one level down.
  Currently applied: Transactions' `description` (`max-w-64`), `account`
  and `class` (`max-w-40` each, wrapped in a `Badge`); Categories' `name`
  (`max-w-72` on the cell, `min-w-0 truncate` on the inner span next to the
  `CategoryIcon`); Descriptions' `description` (`max-w-64`) and `class`
  (`max-w-40`); Accounts' `account` (`max-w-40`), `name` (`max-w-56`), and
  `source` (`max-w-32`, also `Badge`-wrapped) — see
  `accounts-column-formatting`. Classes' `name` column doesn't use
  `truncate` at all (no `cellClassName` beyond `font-medium`) and is
  unaffected — it relies on the shared `TableCell`'s default `break-words`
  wrapping instead, which never causes horizontal overflow since a wrapped
  line never forces the column wider, just the row taller. Wrapping instead
  of truncating is a legitimate alternative for a column that doesn't need
  to guarantee a single line; don't add `truncate`/`max-w-*` to a column
  that's fine wrapping just for consistency's sake.
  If a table still needs its container widened after this (rather than
  tightening a `max-w-*` further), Transactions and Accounts both use
  `max-w-5xl` on the page (`mx-auto flex w-full max-w-5xl flex-col gap-6
  p-6`) instead of a narrower one — Categories/Classes keep `max-w-3xl`,
  Descriptions keeps `max-w-4xl`, since their column counts are lower and
  they don't need the extra room.
- **Row selection**: `useRowSelection` (`src/hooks/use-row-selection.ts`) —
  call it with the page's row array and a `getId` function (usually
  `(row) => row.id`; Descriptions keys on `(row) => row.description` since
  `mapped_descriptions`' primary key is `(user_id, description)`, no `id`
  column). It returns `selected`, `allSelected`/`someSelected` (for the
  header checkbox's `checked`/`indeterminate`), `toggleAll`/`toggleOne`,
  `clear`, `selectedRows`, and `soleSelectedRow` (non-null only when exactly
  one row is checked) — none of the 5 tables destructure `soleSelectedRow`
  any more (Edit no longer depends on checkbox selection, see below), but
  the hook still returns it for a future consumer that might need it.
  **Per-row checkboxes are hidden until hovered or checked** — the header's select-all `Checkbox` stays always visible, but
  each body row's own `Checkbox` gets `className="opacity-0
  transition-opacity group-hover:opacity-100 focus-visible:opacity-100
  data-[checked]:opacity-100"`, and its `<TableRow>` gets `className="group"`
  so `group-hover` has something to key off. `data-[checked]` (not
  `data-state`) is Base UI's own attribute for a checked `Checkbox` (see
  `src/components/ui/checkbox.tsx`) — that's what keeps a selected row's
  checkbox visible after the mouse moves away.
- **Per-row actions live in a "⋮" menu, one column after the checkbox
  column — not in the toolbar.** `RowActionsMenu`
  (`src/components/row-actions-menu.tsx`) is a `DropdownMenu` (Base UI, same
  primitives `ColumnsMenu` uses) whose trigger is `<Button variant="ghost"
  size="icon-sm" aria-label="Row actions" title="Row actions"><MoreVerticalIcon
  /></Button>`. Unlike the per-row `Checkbox` (hover-revealed, see below),
  **this trigger is always visible** — it's the only way to reach a single
  row's Edit, so it has to be reachable without hovering (keyboard, touch).
  Render one unlabeled `<TableHead className="w-0" />` right after the
  checkbox header, and one `<TableCell>` right after the checkbox cell in
  every body row, holding `<RowActionsMenu onEdit={...} onDelete={...}
  onSync={...} disabled={isSyncing || isDeleting} />` scoped to that row:
  - `onEdit` sets a per-row `editing<X>: <Row> | null` state (e.g.
    `editingAccount`) instead of relying on checkbox selection.
  - `onDelete` confirms via `window.confirm("Delete this account? ...")`
    (singular wording — this is a single row, not a bulk op) then calls the
    existing bulk delete action with a one-element array (e.g.
    `deleteAccounts([account.id])`), inside the existing `startDelete`
    transition.
  - `onSync` is only passed on tables that have a sync concept at all
    (Accounts, Transactions) and only when that specific row is eligible
    (Accounts: `account.is_automatic && account.pluggy_item_id`;
    Transactions: `transaction.category_id`) — passing `undefined` omits
    the Sync item from the menu entirely. It calls the existing single-item
    sync path (`syncPluggyItem`/`syncDescriptionsFromTransactions` scoped to
    that one id), inside the existing `startSync` transition.
  Menu item order is Edit, Sync (if present), a `DropdownMenuSeparator`,
  then Delete with `variant="destructive"`. Items carry their own icon +
  visible text label, so they don't need `title`.
  **The edit dialog is keyed off that `editing<X>` state, not
  `soleSelectedRow`** — `useRowSelection`'s `soleSelectedRow` is no longer
  destructured in any table (bulk `selected`/`toggleAll`/`toggleOne`/
  `clear`/`selectedRows` are still used for bulk Delete/Sync). The dialog's
  `open` is `editing<X> !== null`, `onOpenChange` and a successful save both
  `setEditing<X>(null)`; guard its render on `{editing<X> && <Dialog ...>}`
  so it has data to prefill from and unmounts cleanly once closed.
- **The toolbar above the table is split into two zones.** Left = generic,
  present on every table: `ColumnsMenu`, the page's "Add" dialog trigger
  (see below), then "Delete" (`Trash2Icon`, `variant="ghost"`
  `size="icon-sm"`, no red fill/destructive styling — that's reserved for
  the row-menu's Delete item; disabled when nothing's selected; confirms via
  `window.confirm(...)` before calling the bulk delete action). "+" sits
  immediately to the left of "Delete". Right (`className="ml-auto flex
  items-center gap-2"`) = table-specific buttons, i.e. ones that don't apply
  to every table — Accounts' "Connect bank" (`ConnectBankButton`, moved into
  this zone from the page header) and both Accounts' and Transactions'
  "Sync" (icon-only `RefreshCwIcon`, `variant="outline"` `size="icon-sm"`,
  spinning via `className={isSyncing ? "animate-spin" : undefined}` while
  pending — this is the *bulk* Sync, still driven by `selected`/
  `selectedRows`), followed by `{selected.size > 0 && <span>{selected.size}
  selected</span>}` (no `ml-auto` on the span itself now — the zone div
  carries it) — render nothing (not a filler placeholder string) when
  nothing's selected. A table with no specific buttons (Categories, Classes,
  Descriptions) still renders this right-hand div; it just ends up empty
  except for the selected-count span. There is no "Edit" button in the
  toolbar anywhere — it's redundant now that every row has its own Edit via
  the "⋮" menu. Icon-only toolbar buttons need `aria-label` *and* `title`
  set to the plain action word ("Columns", "Sync", "Delete", "Connect
  bank") for the same reason "Add" buttons do (see below) — `ColumnsMenu`'s
  trigger needs this pair too, it's easy to forget since it has no visible
  label either.
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
  of `{ key: SortKey; label: string; align?; cellClassName?; headerIcon?:
  LucideIcon; headerIconOnly?: boolean }` and a `renderCell(row, key)`
  switch, then maps `visibleColumns` (`order`, minus `hidden`) to both the
  header row (`SortableTableHead`s) and each body row's cells — this keeps
  the header and cell counts from ever desyncing. `ColumnsMenu`'s own
  show/hide list always reads `column.label` as plain text regardless of
  `headerIcon` — that field only changes what the *header cell* renders.
  **Column header icons**: a column whose values are a foreign-key
  reference to another entity (Category, Class, Account) sets `headerIcon`
  to that entity's icon and `headerIconOnly: true` — reuse the same icon
  already assigned to that entity in `sidebar-nav.tsx` (Category =
  `TagIcon`, Class = `TagsIcon`, Account = `LandmarkIcon`), rendered via the
  shared `<ColumnHeaderIcon icon={column.headerIcon} label={column.label}
  iconOnly={column.headerIconOnly} />` (`src/components/column-header-icon.tsx`)
  as the header cell's children instead of `column.label` directly. The
  *origin* table's own identity column (Categories'/Classes'/Accounts'
  "Name") gets the same treatment but with `headerIconOnly` left `false` —
  icon **and** text, since there's no ambiguity about which entity's icon it
  is. `ColumnHeaderIcon` puts a `title` (native tooltip) on the icon-only
  case and an `sr-only` text label for accessibility; the icon+text case
  needs neither since the label is already visible. Don't change cell
  rendering or column alignment as part of adding a header icon — it's a
  header-only change (see the "Category-as-foreign-column" bullet below for
  how the *cells* render).
- **Column header titles are centered by default.** `SortableTableHead`
  (`src/components/sortable-table-head.tsx`, `align` is `"left" | "right" |
  "center"`) defaults `align` to `"center"` — a column omits `align`
  entirely in `COLUMNS` unless it needs to deviate from that (nothing
  currently does; there used to be per-column `align: "center"` overrides
  before centering became the default, most of which are now redundant but
  harmless). This is a *header-only* setting — it doesn't touch the body
  cell's own alignment, which is controlled independently by that column's
  `cellClassName` (e.g. Transactions' `amount` and Accounts' `balance` have
  a centered header but keep `cellClassName: "text-right"` on the cell, so
  the numbers themselves still right-align under a centered title).
- **Sorting**: still via the shared `SortableTableHead` component. Each
  page keeps its own `sort.ts` exporting `SORT_KEYS as
  const`, `SortKey`, and `isSortKey`, imported by both `page.tsx` (to parse
  `searchParams`) and the `<X>Table` client component. The actual row order
  is still computed server-side in `page.tsx` with a `switch (sortKey)`
  before the sorted array is passed down — don't rely on the DB query's
  `.order()`. `sortHref(column)` is rebuilt locally inside the client table
  component (not passed down as a prop — functions aren't serializable
  across the server/client boundary), since header cells now render
  client-side to respect column order/visibility; it must preserve any
  page-level filters in the URL (Transactions' `month`).
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
  toolbar's left/generic zone, not from the server `page.tsx` header —
  `page.tsx` keeps only the `<h1>` and any page-level, non-row controls
  (Descriptions' `SyncButton`/`AutoCategorizeButton`, Transactions' month
  nav). Accounts' `ConnectBankButton` used to live in `page.tsx` too but now
  renders inside the table's right/specific toolbar zone, next to "Sync" —
  see the "Connect bank" bullet below. Classes and Descriptions render their
  `Add*Dialog` unconditionally inside the table (safe because `page.tsx`
  only mounts the table when categories exist); Transactions swaps its "+"
  for a "Create an account first" link button when `accounts.length === 0`,
  using the same `accounts` prop the table already receives.
- **"Connect bank" is icon-only too**, `PlugZapIcon` (`lucide-react`),
  `variant="outline"` `size="icon-sm"` to match the other toolbar icon
  buttons, `aria-label`/`title="Connect bank"`. `ConnectBankButton`
  (`src/app/accounts/connect-bank-button.tsx`) keeps its own Pluggy-connect
  logic (token fetch, the dynamically-imported `PluggyConnect` modal) fully
  isolated, but takes `onError`/`onConnected` callback props instead of
  owning its own error state — `AccountsTable` wires `onError={setActionError}`
  and `onConnected={() => router.refresh()}` so the error surfaces through
  the same shared `actionError` paragraph as Edit/Delete/Sync, instead of a
  separate one. It renders first in the right/specific toolbar zone,
  followed by the bulk "Sync" button.
- **Edit/Add dialogs**: `Label` + `Input`/`Select` fields per `@/components/ui`.
  Add dialogs (still a standalone `DialogTrigger`-wrapped `Dialog`, e.g.
  `AddAccountDialog`) keep their own local `error` state, shown as
  `{error && <p className="text-sm text-destructive">{error}</p>}` above the
  footer. Edit dialogs, now opened from a row's "⋮" menu, share the table's
  single `actionError` state instead (also used by Delete/Sync/etc.) — don't
  duplicate the error paragraph inside the dialog too; the outer one stays
  visible (dimmed) behind the modal backdrop. Server actions should throw
  `Error`s with user-facing messages (see the unique-name violation handling
  in `src/app/categories/actions.ts`).
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
  "category" case each render `<span title={category.name}
  className="inline-flex"><CategoryIcon icon={category.icon}
  className="size-4" /></span>` — a bare icon with the name only as a hover
  tooltip, not a chip. Its `COLUMNS` entry sets `align: "center",
  cellClassName: "text-center"` (widen each file's `COLUMNS` `align` field
  type to include `"center"` if it doesn't already, and pass
  `align={column.align}` through to `SortableTableHead` — Classes and
  Descriptions didn't wire that prop through at all until this column
  needed it) so the icon sits centered under the header rather than
  left-aligned like a text column. **The wrapping span's `inline-flex` is
  load-bearing, not decorative**: Tailwind's preflight sets `svg { display:
  block }`, so a bare `<CategoryIcon>` is a block box and `text-align:
  center` on the `<td>` (which only affects inline-level content) has no
  effect on it — the icon stays pinned left regardless of `cellClassName`.
  Wrapping it in an `inline-flex` span makes the *span* the inline box that
  `text-align: center` positions, while the icon lays out fine inside as a
  flex item. Don't drop that wrapper or swap it for a plain `<span>` when
  touching this cell. (The column's *header*, above this cell, is a
  separate icon-only `TagIcon` via `headerIcon`/`ColumnHeaderIcon` — see the
  "Column header icons" bullet above; don't conflate the two, the header
  icon is generic/per-column and the cell icon is per-row/per-category.)
  This is different from the
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
