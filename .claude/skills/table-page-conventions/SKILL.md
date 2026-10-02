---
name: table-page-conventions
description: Use when adding a new list-style page or touching an existing one (Search's results table, Categories, Classes, Descriptions, Accounts) — table markup, row selection, the two-group toolbar (left: Add-or-"N selected" swap, page-wide buttons like "Apply rules"/Accounts' Sync, then "⋮"; right: Show inactive, Columns), the toolbar "⋮" menu that holds every action on the selected rows — one or many — (Edit, Create rule, Import, Deactivate/Activate, Delete; no toolbar button may duplicate one, no per-row ⋮ column), column show/hide & reorder, column header icons, sorting, add/edit dialogs, category/class chip rendering, the app-wide symbol-display rule (a value's name only in its original table, elsewhere just its symbol — category icon, type ↑↓➔, autonomy 🔒🔓 padlocks), which tables can hard-delete a row at all (Categories/Classes/Descriptions only, via "⋮" — Search's transactions and Accounts are deactivate-only, no delete path at all, per explicit user request for safety), or bulk mutations. Encodes this app's shared list-page architecture so new pages match instead of inventing a fresh layout.
---

# Table page conventions

All list-style pages (Transactions, Categories, Classes, Descriptions,
Accounts) follow the same structure: a server `page.tsx` that fetches and
sorts the rows, handing them to a client `<X>Table` component
(`accounts-table.tsx`, `categories-table.tsx`, `classes-table.tsx`,
`descriptions-table.tsx`, `search/search-table.tsx`) that owns selection,
column preferences, and all row interaction. Match this when adding a new
list page instead of inventing a fresh layout.

- **Categories and Classes share one page: a tree table at `/categories`**
  (`categories/categories-table.tsx`, "Categories & Classes"; `/classes`
  only redirects there). Built per explicit user request, as a trial —
  it's one self-contained commit so it can be reverted cleanly. Category
  rows expand/collapse by clicking the name (like the Dashboard dynamic
  table, no chevron; start collapsed, "Expand all" in the right toolbar
  group). A class row is one `category_classes` link, so a shared class
  shows under each category (keyed `cls:<categoryId>:<classId>`) with an
  "also in" icon list; classes with no link sit under a trailing
  "(No category)" group. `page.tsx` builds `CategoryGroup[]` and sorts
  each level by the sort key that applies to it. The "+" is a menu
  (Category / Class). "⋮" adds `extraActions`: on one category, "Add
  class" (preselects it) and "Link existing class"; on class rows only,
  "Remove from category" (`unlinkClassesFromCategories`). Delete only for
  a single-kind selection; Activate/Deactivate works on mixed selections.
  Everything below that says "Categories" or "Classes" table refers to
  this page's category rows / class rows.
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
  columns can be hidden/reordered).
  **Why the pairing matters:** in `auto` layout, `white-space: nowrap`
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
  (`max-w-40`, wrapped in a `Badge`); Categories' `name`
  (`max-w-72` on the cell, `min-w-0 truncate` on the inner span next to the
  `CategoryIcon`); Descriptions' `description` (`max-w-64`); Accounts' `account` (`max-w-40`), `name` (`max-w-56`), and
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
  one row is checked) — every table destructures `soleSelectedRow` to drive
  the toolbar's "⋮" actions menu (see below).
  **Per-row checkboxes are hidden until hovered or checked — except on
  touch screens** — the header's select-all `Checkbox` stays always
  visible, but each body row's own `Checkbox` gets `className="opacity-0
  transition-opacity group-hover:opacity-100 focus-visible:opacity-100
  data-[checked]:opacity-100 pointer-coarse:opacity-100"`, and its
  `<TableRow>` gets `className="group"` so `group-hover` has something to
  key off. `data-[checked]` (not `data-state`) is Base UI's own attribute
  for a checked `Checkbox` (see `src/components/ui/checkbox.tsx`) — that's
  what keeps a selected row's checkbox visible after the mouse moves away.
  **`pointer-coarse:opacity-100` is load-bearing**: phones can't hover, and
  the checkbox is now the only way to reach a row's Edit (see the next
  bullet), so it must always show on touch devices.
- **Every action on the selected rows lives in one "⋮" menu in the
  toolbar; no toolbar button may duplicate it.** Set per explicit user
  request ("on each page, no buttons with the same function"; "all recycle
  bins and deactivate buttons must be in the three dots button").
  **The rule: the toolbar holds page-wide actions, "⋮" holds selection
  actions.** There is no per-row "⋮" column either (removed earlier, per
  explicit user request, since it cost a whole column of width).
  `RowActionsMenu` (`src/components/row-actions-menu.tsx`) is a
  `DropdownMenu` (Base UI, same primitives `ColumnsMenu` uses) whose
  trigger is `<Button variant="ghost" size="icon-sm" aria-label="Actions
  for selected rows" title="Actions"><MoreVerticalIcon /></Button>`. Each
  table renders `{selected.size > 0 && <RowActionsMenu ... />}` **last in
  the toolbar's left group** — so it exists whenever one *or more* rows
  are checked. Every prop is an optional handler, and an omitted handler
  hides its item, so the caller passes only what applies to the current
  selection:
  - `onEdit` — single row only (`soleSelectedRow ? ... : undefined`),
    sets an `editing<X>: <Row> | null` state from `soleSelectedRow`.
    **Exception: Search** passes `onEdit` for any selection — one row opens
    the full edit dialog, several open the batch Category/Class/Autonomy
    editor (`bulk-edit-dialog.tsx`, `setBulkEditOpen(true)`). There used to
    be a separate toolbar "Edit selected" pencil for that; it was folded in
    here so there's one Edit.
  - `onCreateRule` — transaction tables only (Search and its Dashboard
    copy), single row with a `category_id`. Calls
    `syncDescriptionsFromTransactions` scoped to that row: it *creates or
    updates* a `mapped_descriptions` rule from the row's category/class,
    then applies the rule set. Labelled "Create rule" (`ListPlusIcon`) — it
    used to be a second "Sync" item, renamed so it can't be mistaken for
    the toolbar's `SyncButton` (below).
  - `onImport` — Accounts only, single row.
  - `onDeactivate` / `onActivate` — any selection size, each passed only
    if some selected row is currently active / inactive
    (`selectedRows.some(...)`), calling the table's bulk
    `set<X>Active(ids, bool)` with `Array.from(selected)`. Search's
    transactions use `is_hidden` under the hood but the UI still says
    Deactivate/Activate.
  - `onDelete` — only on the tables that can hard-delete at all
    (Categories, Classes, Descriptions); calls the table's existing
    `handleDelete`, which confirms via `window.confirm(...)` with the count
    before calling the bulk delete action. Rendered **last, below a
    `DropdownMenuSeparator`, as `variant="destructive"`** (red) — that
    styling plus the confirm is what keeps accidental deletes unlikely now
    that there's no separate recycle-bin button.
    **History:** Delete used to be *kept out* of this menu, as a toolbar
    recycle bin, for safety — per an earlier user request. The user later
    asked for every recycle bin to move into "⋮", which replaced that rule.
    **Search's transactions and Accounts still have no delete path at
    all** — deactivate-only (`accounts.is_active`, migration
    `0020_accounts_is_active.sql`; transactions reuse `is_hidden`).
    `deleteAccounts`/`deleteTransactions` were deleted entirely — don't
    reintroduce either without a fresh ask.
  Menu item order: Edit, Create rule, Import, Deactivate, Activate,
  separator, Delete. Items carry their own icon + visible text label, so
  they don't need `title`.
  **The edit dialog is keyed off that `editing<X>` state, not
  `soleSelectedRow` directly** — `soleSelectedRow` only decides whether
  `onEdit` is offered and which row it copies into `editing<X>`. The
  dialog's `open` is `editing<X> !== null`, `onOpenChange` and a successful
  save both `setEditing<X>(null)`; guard its render on `{editing<X> &&
  <Dialog ...>}` so it has data to prefill from and unmounts cleanly once
  closed.
- **The toolbar above the table has two button groups, left and right,
  spread apart by an outer `<div className="flex items-center
  justify-between">`.** The **right** group (`<div className="flex
  items-center gap-2">`) holds only the "Show/Hide inactive" toggle
  (every table except Descriptions, rendered whenever `inactiveCount > 0`)
  and then `ColumnsMenu`, at the far right. **No Delete or
  Deactivate/Activate button lives in either group any more** — those are
  "⋮" items (see above). The **left** group (`<div className="flex
  items-center gap-2">`, always rendered — this is what keeps "+"
  reachable even when the row list is empty, see below) holds, in order:
  1. **Either the page's "Add" dialog trigger, or a `"{selected.size}
     selected"` label in that exact same slot** — `{selected.size > 0 ? (
     <span className="text-sm text-muted-foreground">{selected.size}
     selected</span> ) : ( <Add*Dialog /> )}`. Selecting a row swaps "+" out
     for the count, in place, rather than showing both side by side.
     Transactions nests one more level here: when nothing's selected it
     chooses between `AddTransactionDialog` and the "Create an account
     first" link button depending on `accounts.length`.
  2. **Page-wide buttons** —
     - `SyncButton` (`src/app/descriptions/sync-button.tsx`) on
       Descriptions and Search: **"Apply rules"** (`WandSparklesIcon`,
       pulses while pending — renamed from "Sync"/`RefreshCwIcon`),
       `syncMappedDescriptions()`, applies the existing rule set to every
       uncategorized transaction in the account, not scoped to any
       selection. Don't merge it with the "⋮" "Create rule" item — they do
       different work (one applies rules, the other creates one).
     - **Accounts' bulk "Sync"** (icon-only `RefreshCwIcon`,
       `variant="outline"` `size="icon-sm"`, spinning while pending) — the
       one deliberate exception to "selection actions live in ⋮": per
       explicit user request it stays a visible toolbar button, **mounted
       only while the selection includes at least one bank-connected
       account** (`is_automatic && pluggy_item_id`), one row or many, and
       syncs each distinct Pluggy item among them. Because of that, Accounts'
       "⋮" deliberately has *no* Sync item.
     **Why no separate "Connect bank" button:** reachable only via the
     Accounts "+" menu, see the "Accounts' '+' is a menu" bullet below.
  3. **The "⋮" `RowActionsMenu`**, last, whenever `selected.size > 0`.
  The Dashboard's embedded table (`dashboard-transactions-table.tsx`)
  follows this same layout — `ColumnsMenu` at the far right on every
  table, per explicit user request (it used to sit first on the left there,
  with "N selected" on the right) — and has the same "⋮" contents as
  `search-table.tsx` minus batch edit (its Edit is single-row only). The
  Dashboard's "Levels" menu (`dashboard-explorer.tsx`, a `ColumnsMenu` for
  the monthly table) is right-aligned too.
  Icon-only toolbar buttons need `aria-label` *and* `title` set to the
  plain action word ("Columns", "Sync", "Apply rules") for the same reason
  "Add" buttons do (see below) — `ColumnsMenu`'s trigger needs this pair
  too, it's easy to forget since it has no visible label either. (This is
  one case of the app-wide `button-hover-names` rule.)
  **The left toolbar group (and thus "+") must render even when the row
  list is empty** — the empty-state message (`"No categories yet."` etc.)
  replaces only the `<Table>` markup via a ternary, never the surrounding
  toolbar, so "+" stays reachable from a zero-row page instead of being
  stranded behind an early return.
- **Column show/hide + reorder**: `useColumnPreferences<SortKey>(storageKey,
  defaultOrder)` (`src/hooks/use-column-preferences.ts`) persists both to
  localStorage under `${storageKey}-hidden-columns` /
  `${storageKey}-column-order` (pick a `storageKey` unique per table, e.g.
  `"search-table"`) and reconciles a stored order against the current
  column set on load, so adding/removing a column later doesn't strand it.
  **Phone widths**: its optional third argument is the table's
  `MOBILE_HIDDEN_COLUMNS` — columns hidden by default below Tailwind's `sm`
  breakpoint (`(max-width: 639px)`, via `useSyncExternalStore` +
  `matchMedia`). Below `sm` the hidden set lives under a separate
  `${storageKey}-mobile-hidden-columns` key, so toggling columns on the
  phone never changes the desktop preference (order is shared). Current
  defaults, per explicit user request: Descriptions hides Operator/Class;
  Categories hides Classes/Autonomy. (Search and Accounts pass none: below
  `sm` they swap the table for a card list — see `search-page-conventions`
  and `accounts-column-formatting`. Card lists share `CardListHeader`,
  `src/components/card-list-header.tsx`: select-all + sort picker +
  direction toggle, the card stand-in for clickable column headers.) Use this rather
  than `hidden sm:table-cell` classes, which the Columns menu couldn't
  override. Page wrappers use `p-4 sm:p-6`. Below `md`, pages that
  have their own slot in the phone bottom nav bar (Dashboard, Budget,
  Search, Accounts — see `src/components/sidebar-nav.tsx`) make their
  `<h1>` `max-md:sr-only`, since the highlighted tab already names the page;
  pages behind its "More" sheet (Categories & Classes, Descriptions) keep
  the `<h1>` visible as `max-md:text-lg`, since "More" alone doesn't say
  which page you're on. `useIsMobile()` (`src/hooks/use-is-mobile.ts`) is the
  shared JS-side phone check (same `sm` breakpoint).
  **Touch sizing lives in the shared `ui/` components, gated on
  `pointer-coarse:`** (so mouse users see no change): `Button` sizes
  default/sm/icon/icon-sm grow to h-10/h-9/size-10/size-10, `TableCell`
  gets `py-3` and `TableHead` `h-12`, `Checkbox` grows to `size-5` with an
  invisible `after:-inset-2.5` hit area, dropdown/select items get
  `py-2.5`, `SelectTrigger` grows a step. Don't re-add per-page touch
  padding on top of these.
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
  `BoxIcon`, Class = `TagIcon`, Account = `LandmarkIcon` — Category was `TagIcon` and Class `TagsIcon` until changed per explicit user request). The transaction
  tables' **Amount** column is also icon-only, `BanknoteIcon` — per
  explicit user request ("a symbol that represents money"; a banknote, not
  `$`, since the app is in BRL). Their **Date** column is likewise
  icon-only, `CalendarIcon`, per explicit user request. The Categories &
  Classes table's **Autonomy** column is icon-only too, `LockOpenIcon`
  (an open padlock: "free / not locked in"), per explicit user request —
  it replaced `HandFistIcon` (a closed fist), which read as force rather
  than freedom. These are rendered via the
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
  currently does). This is a *header-only* setting — it doesn't touch the body
  cell's own alignment, which is controlled independently by that column's
  `cellClassName` (e.g. Transactions' `amount` and Accounts' `balance` have
  a centered header but keep `cellClassName: "text-right"` on the cell, so
  the numbers themselves still right-align under a centered title).
  **Why some `COLUMNS` entries still set `align: "center"` explicitly:**
  there used to be per-column overrides before centering became the
  default — most are now redundant but harmless, no need to strip them out
  proactively.
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
  page-level filters in the URL (Transactions' `month`). **This is
  URL-driven sort, the default for all 5 dedicated table pages.**
  `SortableTableHead` (`src/components/sortable-table-head.tsx`) also
  accepts an `onSort: () => void` instead of `href`, as a discriminated
  union (exactly one of the two) — this renders a `<button>` instead of a
  `Link`, for a table that sorts in place via local state rather than
  navigating. The only current user is the Dashboard's embedded filtered
  table (`dashboard-transactions-table.tsx`, see `dashboard-conventions`) —
  a page-level table should still prefer `href`/URL sort unless it has the
  same reason not to (the Dashboard table's sort state would otherwise be
  lost by navigating to `/search`, which also wouldn't reflect its
  category filter).
- **"Add" buttons are icon-only**, a `PlusIcon` (`lucide-react`) with no
  label text and `variant="ghost"` — e.g. `AddAccountDialog`'s
  `DialogTrigger` renders `<Button variant="ghost" size="icon"
  aria-label="Add account" title="Add account"><PlusIcon /></Button>`
  instead of a filled button reading "Add account". `ghost` (no background
  fill) is the standard for every "+" trigger across the app. Always pair the icon
  with `aria-label` *and* `title` set to the same descriptive text ("Add
  account", "Add category", ...) — the icon alone doesn't convey which row
  type it adds, and dropping the label removes the only other cue, so both
  the accessible name and the hover tooltip must carry it. The `Add*Dialog`
  component itself is rendered from inside the `<X>Table` client component's
  toolbar button group, not from the server `page.tsx` header — `page.tsx`
  keeps only the `<h1>` and any page-level, non-row controls (Transactions'
  month nav). Classes and
  Descriptions render their `Add*Dialog` unconditionally inside the table
  (safe because `page.tsx` only mounts the table when categories exist);
  Transactions swaps its "+" for a "Create an account first" link button
  when `accounts.length === 0`, using the same `accounts` prop the table
  already receives.
  **Why:** Accounts set the `ghost`-variant "+" precedent, the rest were
  brought in line with it. Descriptions' `SyncButton` used to live in
  `page.tsx` too but now renders inside the table's own toolbar (see
  above).
- **Accounts' "+" is a menu, not a plain dialog trigger**: `AddAccountMenu`
  (`src/app/accounts/add-account-menu.tsx`). Same `<Button variant="ghost"
  size="icon" aria-label="Add account"
  title="Add account"><PlusIcon /></Button>` trigger, but it opens a
  `DropdownMenu` (same primitives as `RowActionsMenu`) with two items:
  "Manually" (`PencilIcon`, sets local `manualOpen` state true, which opens
  a plain-`Dialog` manual-entry form) and "Connect" (`PlugZapIcon`, fetches
  a connect token via `getPluggyConnectToken`, then renders the
  dynamically-imported `PluggyConnect` modal once the token resolves).
  `AddAccountMenu` takes `onError`/`onConnected` callback props —
  `AccountsTable` wires `onError={setActionError}` and
  `onConnected={() => router.refresh()}` — so a failure from either path
  (manual validation is separate, this is specifically the Pluggy-connect
  error path) surfaces through the same shared `actionError` paragraph as
  Edit/Delete/Sync. There is no standalone "Connect bank" toolbar
  button on any table — don't reintroduce one; the bulk "Sync" button
  (for already-connected accounts) is the only Pluggy-specific button left
  in the toolbar's left group, right after "+".
  **Why:** `AddAccountMenu` replaces what used to be two separate toolbar
  entries — a standalone `AddAccountDialog` and a standalone "Connect
  bank" `ConnectBankButton`, both now deleted; the "Manually"/"Connect"
  items own the same fields/behavior and callback props those two
  components used to, just relocated into one menu.
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
  with `"box"` (`DEFAULT_CATEGORY_ICON`, the Categories entity icon) as the fallback for an
  unrecognized/missing key. Nothing should reintroduce per-category color.
  Render the icon with the shared
  `<CategoryIcon icon={category.icon} className="..." />`
  (`src/components/category-icon.tsx`) rather than looking up
  `CATEGORY_ICON_MAP` directly, so the fallback stays centralized. Add/Edit
  Category dialogs let the user pick one via `<IconSwatchPicker name="icon"
  value={icon} onChange={setIcon} />` (`src/components/icon-swatch-picker.tsx`).
  **Why:** categories used to carry a `color` field instead — that column
  was dropped (see `supabase/migrations/0015_categories_icon.sql`, which
  also re-seeds the on-signup default categories with fitting icons); the
  icon picker uses the same swap-a-button-grid pattern the old
  `ColorSwatchPicker` used.
- **App-wide symbol-display rule: a value's full name appears only in its
  own original table; anywhere else, if the value has a symbol, show only
  the symbol (name as a `title` tooltip).** Set per explicit user request.
  Values with symbols and their sources:
  | Value | Symbol | Defined in | Original table |
  |---|---|---|---|
  | Category | its icon (`CategoryIcon`) | `categories.icon` | Categories (`categories-table.tsx`: icon **and** name) |
  | Type (income/expense/transfer) | `➔` rotated up / down / right (same glyph, so identical weight — `↑`/`↓` render thinner) | `TRANSACTION_TYPE_SYMBOLS` + `TRANSACTION_TYPE_SYMBOL_ROTATION` (wrapper must be inline-block/flex), `@/lib/transaction-type.ts` | none |
  | Autonomy (low/high) — called "gordura" until renamed per explicit user request (DB columns `transactions.autonomy` / `classes.autonomy` via `0023_rename_gordura_to_autonomy.sql`) | closed / open padlock (lucide `LockIcon` / `LockOpenLeftIcon`, a custom-drawn padlock whose lifted shackle swings open to the left, per explicit user request from a reference screenshot, drawn in the exact style of lucide's lock icons (same body, same shackle radius, no keyhole) — the Autonomy column header deliberately keeps lucide's plain `LockOpenIcon`; were `▢` `△` until changed per explicit user request) | `AUTONOMY_ICONS`, `@/lib/classification.ts`, rendered via `AutonomyIcon` / `AutonomyOptionLabel` (`src/components/autonomy-icon.tsx`) | none |
  | Class | its icon (`CategoryIcon`) | `classes.icon` (migration `0021_classes_icon.sql`, same `CATEGORY_ICON_MAP` palette, `DEFAULT_CLASS_ICON = "tag"`, DB default via `0022_entity_icon_defaults.sql`, picked via `IconSwatchPicker` in `class-form-fields.tsx`) | Classes (`classes-table.tsx`: icon **and** name) |
  | Account type (checking/investment/credit card/other — stored `manual` is labeled "Other") | lucide `CoinsIcon` / `PiggyBankIcon` / `CreditCardIcon` / `CircleEllipsisIcon` (Checking was `BanknoteIcon` until changed per explicit user request — too close to the card icon, and it doubled as the Amount header icon) | `AccountTypeIcon` / `AccountTypeOptionLabel` + `ACCOUNT_TYPE_LABELS`, `src/components/account-type-icon.tsx` | none (Accounts' Type column and phone cards are icon-only; the add/edit Type `Select`s are pickers, icon + name). Added per explicit user request |
  Accounts themselves and Descriptions have no symbols, so they always
  show their names. A value with no symbol of its own (e.g. the "Uncategorized"
  / "Unclassed" pseudo-values) keeps its text. Where it's applied today:
  every table's Category and Class columns (see the next bullet); the
  Dashboard dynamic table's Type/Category/Class/Autonomy rows
  (`dashboard-monthly-table`);
  the Categories table's **Type** column (`TRANSACTION_TYPE_SYMBOLS`,
  `text-base font-bold text-muted-foreground`, same as the dynamic table's
  Type symbol); the Classes table's Autonomy column; and the Search filter
  bar's chips (`Category: 🛒 🚌`, `Autonomy: 🔓` — `search-page-conventions`).
  **Two deliberate exceptions, both confirmed by the user:**
  - **Pickers** (dropdowns, checkbox lists, filter suggestions) keep the
    name, since choosing from bare icons is error-prone — category
    dropdowns show the name, Autonomy options show `<AutonomyOptionLabel>`
    (padlock + "Alta"), the category-type `Select` shows "Income"/"Expense"/
    "Transfer".
  - **Budget** (`yearly-grid.tsx`, `monthly-execution.tsx`) keeps icon +
    name: each row there is identified by its category alone, with no
    other text, so icons alone would make rows hard to tell apart.
  When adding a new table, chip, or other read-only display of one of
  these values, apply the rule; when unsure whether something is a picker
  or a display, ask.
- **Category-as-foreign-column is icon-only, no name, no `Badge`, and
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
  left-aligned like a text column.
  **Why the wrapping `<span className="inline-flex">` is load-bearing, not
  decorative**: Tailwind's preflight sets `svg { display: block }`, so a
  bare `<CategoryIcon>` is a block box and `text-align: center` on the
  `<td>` (which only affects inline-level content) has no effect on it —
  the icon stays pinned left regardless of `cellClassName`. Wrapping it in
  an `inline-flex` span makes the *span* the inline box that `text-align:
  center` positions, while the icon lays out fine inside as a flex item.
  Don't drop that wrapper or swap it for a plain `<span>` when touching
  this cell. (The column's *header*, above this cell, is a separate
  icon-only `BoxIcon` via `headerIcon`/`ColumnHeaderIcon` — see the
  "Column header icons" bullet above; don't conflate the two, the header
  icon is generic/per-column and the cell icon is per-row/per-category.)
  This is different from the
  Categories table's own Name column and Budget's category rows
  (`yearly-grid.tsx`, `monthly-execution.tsx`), which still show the icon
  *next to* the visible name (no `Badge` there either, but the name stays
  on the page) — Categories because it's the original table, Budget as a
  confirmed exception to the symbol-display rule (see the previous bullet).
  **Class-as-foreign-column is rendered exactly the same way** (Search,
  the Dashboard's embedded table, Descriptions): `<span
  title={class.name} className="inline-flex"><CategoryIcon
  icon={class.icon} className="size-4" /></span>`, `align: "center",
  cellClassName: "text-center"` — per explicit user request ("the name of
  the class only needs to be shown in the class table"). Transactions'
  Account column (no icon of its own) instead uses a `Badge`
  (`variant="secondary" className="max-w-full gap-1 truncate"`, no
  leading icon) — see `transactions-column-formatting`.
  **Why there's no fill-color version any more:** the Dashboard used to
  have three category-breakdown bar charts that needed a real fill color
  per bar instead of an icon — `sequentialColor()`,
  `src/lib/chart-colors.ts` — but all were removed per explicit user
  request; see `dashboard-conventions`'s "removed charts" history and
  `amount-color-conventions` for what's left of the Dashboard's own
  red/green/gray usage now that they're gone.
- **Mutations**: bulk actions take an array (`deleteMappedDescriptions(descriptions:
  string[])`, `setAccountsActive(ids: string[], isActive: boolean)`, etc.) and delete/update
  via `.in(...)`, guarded by `.eq("user_id", user.id)` like every other
  action. Server actions call `revalidatePath` for every page that displays
  the changed data (a category edit revalidates `/categories` *and*
  `/search`, for instance) — check for cross-page dependencies before
  assuming one path is enough. A bulk action shouldn't touch `updated_at` if
  that column is read elsewhere as a meaningful timestamp (e.g. Accounts'
  "Last sync" column reads it as "last synced" for automatic accounts —
  relabeling one via the Edit dialog must not bump it).
