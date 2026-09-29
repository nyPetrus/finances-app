---
name: table-page-conventions
description: Use when adding a new list-style page or touching an existing one (Search's results table, Categories, Classes, Descriptions, Accounts) — table markup, row selection, the two-group toolbar (left: Add-or-"N selected" swap, table-specific buttons, "⋮" menu; right: Delete/Deactivate depending on the table, then Columns), the toolbar "⋮" actions menu for the single checked row (Edit/Sync/Toggle active — no Delete; no per-row ⋮ column), column show/hide & reorder, column header icons, sorting, add/edit dialogs, category/class chip rendering, the app-wide symbol-display rule (a value's name only in its original table, elsewhere just its symbol — category icon, type ↑↓➔, gordura ▢△), which tables can hard-delete a row at all (Categories/Classes/Descriptions only — Search's transactions and Accounts are deactivate-only, no delete path at all, per explicit user request for safety), or bulk mutations. Encodes this app's shared list-page architecture so new pages match instead of inventing a fresh layout.
---

# Table page conventions

All list-style pages (Transactions, Categories, Classes, Descriptions,
Accounts) follow the same structure: a server `page.tsx` that fetches and
sorts the rows, handing them to a client `<X>Table` component
(`accounts-table.tsx`, `categories-table.tsx`, `classes-table.tsx`,
`descriptions-table.tsx`, `search/search-table.tsx`) that owns selection,
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
- **Row actions live in a "⋮" menu in the toolbar, acting on the single
  checked row — there is no per-row "⋮" column any more.** Removed per
  explicit user request (the per-row column cost a whole column of width
  on every table). `RowActionsMenu` (`src/components/row-actions-menu.tsx`)
  is a `DropdownMenu` (Base UI, same primitives `ColumnsMenu` uses) whose
  trigger is `<Button variant="ghost" size="icon-sm" aria-label="Actions
  for selected row" title="Actions"><MoreVerticalIcon /></Button>`. Each
  table renders `{soleSelectedRow && <RowActionsMenu onEdit={...}
  onSync={...} disabled={isSyncing || isDeleting} />}` in the toolbar's
  left group, **last in that group** — so it only exists while exactly one
  row is checked (with 2+ checked, only the bulk buttons show), and every
  handler closes over `soleSelectedRow`:
  - `onEdit` sets an `editing<X>: <Row> | null` state (e.g.
    `editingAccount`) from `soleSelectedRow`; the dialog keys off that
    state (see below), so it survives the selection changing underneath.
  - **`RowActionsMenu` has no `onDelete` prop and no Delete item at all —
    on the tables that can hard-delete a row at all (Categories/Classes/
    Descriptions), the *only* way to do it is the toolbar's bulk Delete
    button (below), which always requires an explicit selection first,
    rather than a single accidental click in an actions menu.** Don't
    reintroduce a menu delete path without a fresh ask; route any future
    single-row delete through the existing bulk action with a one-element
    array instead, called from the Delete button, not from the actions
    menu.
    **Why:** removed per explicit user request, for security. Every
    table's own `handleDeleteRow(row)` (which used to confirm + call the
    delete action with a one-element array, e.g.
    `deleteAccounts([account.id])`) was deleted along with its wiring.
    **Search's transactions and Accounts went further and lost the bulk
    Delete button too — they have no delete path at all any more, only
    `onToggleActive`/`isActive`** (same as Categories/Classes always had),
    backed by `setTransactionsActive`/`setAccountsActive` in
    `transactions/actions.ts`/`accounts/actions.ts` (Accounts needed a new
    `accounts.is_active` column for this, migration
    `0020_accounts_is_active.sql`; Search's transactions already had an
    unused `is_hidden` column that this repurposed — presented in the UI
    with the same "Deactivate"/"Activate" vocabulary as everywhere else,
    even though the underlying column is named `is_hidden` not
    `is_active`). `deleteAccounts`/`deleteTransactions` were deleted
    entirely, not just unwired — don't reintroduce either without a fresh
    ask.
  - `onSync` is only passed on tables that have a sync concept at all
    (Accounts, Search's transaction table — and its Dashboard-embedded
    copy, `dashboard-transactions-table.tsx`, see `dashboard-conventions`)
    and only when the selected row is eligible (Accounts:
    `is_automatic && pluggy_item_id`; transactions: `category_id`) —
    passing `undefined` omits the Sync item from the menu entirely. It calls
    the existing single-item sync path (`syncPluggyItem`/
    `syncDescriptionsFromTransactions` scoped to that one id), inside the
    existing `startSync` transition.
  Menu item order is Edit, Sync (if present), Import (if present,
  Accounts only), Toggle active (if present) — no trailing separator, since
  there's no destructive item after it any more. Items carry their own icon
  + visible text label, so they don't need `title`.
  **The edit dialog is keyed off that `editing<X>` state, not
  `soleSelectedRow` directly** — `soleSelectedRow` only decides whether the
  menu exists and which row `onEdit` copies into `editing<X>`. The dialog's
  `open` is `editing<X> !== null`, `onOpenChange` and a successful save both
  `setEditing<X>(null)`; guard its render on `{editing<X> && <Dialog ...>}`
  so it has data to prefill from and unmounts cleanly once closed.
- **The toolbar above the table has two button groups, left and right,
  spread apart by an outer `<div className="flex items-center
  justify-between">`.** The **right** group is its own `<div
  className="flex items-center gap-2">`, in this order: the "Show/Hide
  inactive" toggle (every table has one now — Categories/Classes/Accounts/
  Search's transactions all support deactivating a row, so all four render
  it whenever `inactiveCount > 0`; Descriptions doesn't, since mappings
  have no active/inactive concept), then **Delete** (the recycle bin, see
  item 3 below) **only on the tables that can hard-delete at all —
  Categories, Classes, Descriptions — never on Search's transactions or
  Accounts**, then `ColumnsMenu` last, at the far right — the outer
  `justify-between` is what pushes the group right while keeping it
  vertically aligned with the left group on the same row. **Delete moved
  here from the end of the left group per explicit user request** ("put
  the recycle bin at the right side above the table") — don't move it back
  left, on the tables that still have it. Everything else lives
  in the **left** group (`<div className="flex items-center gap-2">`,
  always rendered — this is what keeps "+" reachable even when the row
  list is empty, see below), in this order:
  1. **Either the page's "Add" dialog trigger, or a `"{selected.size}
     selected"` label in that exact same slot** — `{selected.size > 0 ? (
     <span className="text-sm text-muted-foreground">{selected.size}
     selected</span> ) : ( <Add*Dialog /> )}`. Selecting a row swaps "+" out
     for the count, in place, rather than showing both side by side.
     Transactions nests one more level here: when nothing's selected it's
     still choosing between `AddTransactionDialog` and the "Create an
     account first" link button depending on `accounts.length`, exactly as
     before — that inner choice is unrelated to the selection swap, it only
     applies to the "nothing selected" branch.
  2. **Any table-specific buttons**, unaffected by selection — currently
     Accounts' own bulk "Sync" (icon-only `RefreshCwIcon`,
     `variant="outline"` `size="icon-sm"`, spinning via
     `className={isSyncing ? "animate-spin" : undefined}` while pending,
     driven by `selected`/`selectedRows` — Pluggy bank sync is genuinely a
     multi-account bulk operation), and Descriptions' own `SyncButton`
     (applies existing `mapped_descriptions` rules to every uncategorized
     transaction, see `transaction-description-rules`), reused verbatim on
     Transactions too, right after the "+"/count slot — see below for how
     this coexists with the per-row Sync that was already there.
     **Why no separate "Connect bank" button here:** it used to be a
     separate toolbar button but is now reachable only via the "+" menu,
     see the "Accounts' '+' is a menu" bullet below. The `SyncButton` reuse
     on Transactions was per explicit user request.
  3. **"Delete" — rendered in the *right* group (just before
     `ColumnsMenu`, see above), not here, and only on Categories/Classes/
     Descriptions — and only rendered at all when `selected.size > 0`.**
     `{selected.size > 0 && <Button ...>Trash2Icon</Button>}`. Not just
     disabled while nothing's selected, the button doesn't exist in the
     DOM until there's a selection, so there's nothing to accidentally
     click. Stays `Trash2Icon`, `variant="ghost"` `size="icon-sm"`, no red
     fill/destructive styling; `disabled` guards the in-flight-mutation
     case (`isDeleting`, plus whatever other transition that table's
     toolbar already tracks) since the `selected.size === 0` guard is
     redundant once the button only mounts when there's a selection.
     Confirms via `window.confirm(...)` before calling the bulk delete
     action, same as always. **Search's transactions and Accounts have no
     Delete button at all** — their right group has only the "Show
     inactive" toggle and `ColumnsMenu`; their left group has Deactivate/
     Activate bulk buttons instead (`ArchiveIcon`/`ArchiveRestoreIcon`,
     same as Categories/Classes' left-group toggle buttons), shown
     conditionally on `selectedRows.some((row) => row.is_active)` /
     `.some((row) => !row.is_active)` exactly like Categories/Classes
     already did.
     **Why:** per explicit user request, for security — the actions
     menu's own Delete item was removed for exactly this reason, see the
     `RowActionsMenu` bullet above, and Search's transactions/Accounts
     went one step further and dropped the toolbar Delete too.
  The "⋮" `RowActionsMenu` (only while exactly one row is checked) sits
  last in the left group, after the table-specific buttons. The
  Dashboard's embedded table (`dashboard-transactions-table.tsx`, a
  different toolbar shape: Columns/Add/⋮ on the left, "N selected" on the
  right) has no Delete either now — its right group has the "Show
  inactive" toggle, and its left group has the same Deactivate/Activate
  buttons as `search-table.tsx`.
  **The transaction tables have two different "Sync" affordances now, doing two
  different things — don't conflate them.** The `RowActionsMenu`'s
  `onSync` item (on both `search/search-table.tsx` and its
  Dashboard-embedded copy) still calls `syncDescriptionsFromTransactions`
  scoped to the one selected row — it *creates/updates* a `mapped_descriptions`
  rule from that row's own (already-set) category/class, then applies the
  full rule set to matching uncategorized transactions; it needs a
  category already on that row to have anything to save. The toolbar's
  `SyncButton` (see above) instead just *applies the existing rule set* —
  `syncMappedDescriptions()`, no new rule created — to every uncategorized
  transaction in the whole account, not scoped to the visible month or any
  selection. Don't merge the two or remove either without checking first;
  they're both still doing distinct, real work.
  **Why both exist:** this is the same button/behavior Descriptions' own
  page already has, reused here per explicit user request after a stretch
  of this toolbar deliberately *not* having a bulk Sync (the removal
  reasoning — "inherently per-transaction, the per-row menu already covers
  it" — no longer holds now that there's a genuinely bulk, no-selection-
  needed sync operation to expose).
  There is no standalone "Edit" button in the toolbar
  anywhere — Edit lives in the "⋮" actions menu. Icon-only toolbar buttons need `aria-label` *and* `title` set to
  the plain action word ("Columns", "Sync", "Delete") for the same reason
  "Add" buttons do (see below) — `ColumnsMenu`'s trigger needs this pair
  too, it's easy to forget since it has no visible label either.
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
  `TagIcon`, Class = `TagsIcon`, Account = `LandmarkIcon`). The transaction
  tables' **Amount** column is also icon-only, `BanknoteIcon` — per
  explicit user request ("a symbol that represents money"; a banknote, not
  `$`, since the app is in BRL). Their **Date** column is likewise
  icon-only, `CalendarIcon`, per explicit user request. These are rendered via the
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
  with `"tag"` as both the last palette entry and the fallback for an
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
  | Type (income/expense/transfer) | `↑` `↓` `➔` | `TRANSACTION_TYPE_SYMBOLS`, `@/lib/transaction-type.ts` | none |
  | Gordura (low/high) | `▢` `△` | `GORDURA_SYMBOLS`, `@/lib/classification.ts` | none |
  Accounts, Classes and Descriptions have no symbols, so they always show
  their names. A value with no symbol of its own (e.g. the "Uncategorized"
  / "Unclassed" pseudo-values) keeps its text. Where it's applied today:
  every table's Category column (see the next bullet); the Dashboard
  dynamic table's Type/Category/Gordura rows (`dashboard-monthly-table`);
  the Categories table's **Type** column (`TRANSACTION_TYPE_SYMBOLS`,
  `text-base font-bold text-muted-foreground`, same as the dynamic table's
  Type symbol); the Classes table's Gordura column; and the Search filter
  bar's chips (`Category: 🛒 🚌`, `Gordura: △` — `search-page-conventions`).
  **Two deliberate exceptions, both confirmed by the user:**
  - **Pickers** (dropdowns, checkbox lists, filter suggestions) keep the
    name, since choosing from bare icons is error-prone — category
    dropdowns show the name, Gordura options show `gorduraOptionLabel()`
    ("△ Alta"), the category-type `Select` shows "Income"/"Expense"/
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
  icon-only `TagIcon` via `headerIcon`/`ColumnHeaderIcon` — see the
  "Column header icons" bullet above; don't conflate the two, the header
  icon is generic/per-column and the cell icon is per-row/per-category.)
  This is different from the
  Categories table's own Name column and Budget's category rows
  (`yearly-grid.tsx`, `monthly-execution.tsx`), which still show the icon
  *next to* the visible name (no `Badge` there either, but the name stays
  on the page) — Categories because it's the original table, Budget as a
  confirmed exception to the symbol-display rule (see the previous bullet). Transactions' Account and Class columns (which have no
  icon of their own) instead use a `Badge` (`variant="secondary"
  className="max-w-full gap-1 truncate"`, no leading icon) — see
  `transactions-column-formatting`.
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
