---
name: transactions-column-formatting
description: Use when touching how the transaction tables (the shared src/components/transactions-table.tsx, used by Search and the Dashboard) format or render their own Date, Amount, Account, or Class column values — these are bespoke to these tables' renderCell, not part of the shared table-page-conventions architecture or the cross-page amount-color-conventions rule.
---

# Transactions table column formatting

These are presentation choices specific to the transaction tables'
`renderCell` — the shared `components/transactions-table.tsx`, rendered
by both Search (`search/search-table.tsx`) and the Dashboard
(`dashboard-transactions-table.tsx`) through thin wrappers — not shared
with the other list pages.

- **Amount has no currency symbol.** `formatCurrency` uses
  `Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2,
  maximumFractionDigits: 2 })` (plain decimal style) instead of `style:
  "currency", currency: "BRL"` — it renders `1.234,56`, not `R$ 1.234,56`.
  Accounts' Balance column (`accounts-table.tsx`) mirrors this same
  no-symbol style (its own local `formatCurrency` copy), and so does the
  Dashboard's embedded transactions table (see `dashboard-conventions`)
  and its monthly breakdown table (see `dashboard-monthly-table`, which
  additionally rounds to 0 decimals). Budget's planned/actual/variance
  still keeps its own `formatCurrency` copy with
  currency style and the `R$` symbol — don't change those unless asked.
  **Why:** the `R$` symbol used to be reserved for the Dashboard's 6 stat
  cards specifically, but those were removed (see `dashboard-conventions`'s
  "removed-cards" history) and nothing on the Dashboard shows `R$` any
  more now.
- **Date is `dd mmm yy` on Search, `dd mmm` (no year) on the Dashboard,
  and never wraps**: `formatDate` renders e.g. `11 set 26` on Search
  (`11 set` on the Dashboard — the wrappers' `showYear` prop picks which)
  via a local `MONTH_ABBREVIATIONS` array
  (`["jan", "fev", ..., "dez"]`, no periods), reading `getUTCDate()` /
  `getUTCMonth()` / `getUTCFullYear()` off the transaction's date string.
  The Date column also sets `cellClassName: "whitespace-nowrap"` in
  `COLUMNS` — needed because the shared `TableCell` wraps by default (see
  `table-page-conventions`), and the format has spaces that would
  otherwise let it break across lines in a narrow column.
  **Why:** both by explicit user request. Both tables went from `DD mmm
  YY` to `dd mmm` (2026-09-29); Search alone got the 2-digit year back
  (2026-10-01), since its filters can span years while the Dashboard's
  table is always a single year. Don't sync the two formats without
  asking.
- **Account renders as a `Badge` chip: the account's type icon, then its
  name** (icon first, like every symbol + name in the app — per explicit
  user request, 2026-10-03; it used to be name first, icon last)
  (`variant="secondary" className="max-w-full gap-1"`, then
  `<AccountTypeIcon type={account.type} className="size-3" />` and the name
  in `<span className="min-w-0 truncate">` — the `min-w-0` lets the
  name, not the icon, give way when the column is narrow). `Account` has
  no `icon` field of its own; the type icon (bank building/piggy bank/card/⋯,
  see `table-page-conventions`' symbol table) is the closest thing, added
  per explicit user request. The phone `TransactionCardList` shows the
  same icon + name. The column is centered (`align: "center"`,
  `text-center` — the `Badge` is inline-flex, so `text-center` positions
  it), like every other icon-bearing column, per explicit user request.
  **Class is icon-only, like Category** (`CategoryIcon` of `classes.icon`,
  name as `title` tooltip, centered, no `Badge`) — see
  `table-page-conventions`'s "Category-as-foreign-column" bullet.
- **Description and Account also need a `max-w-*` on the cell
  alongside `truncate`** (`max-w-64`, `max-w-40` respectively
  in `COLUMNS`' `cellClassName`) — see `table-page-conventions`'s
  "A column's `cellClassName: truncate`..." bullet for why the `truncate`
  on the `Badge` itself isn't enough on its own.
- **Account, Category, and Class headers are icon-only** (`LandmarkIcon`,
  `BoxIcon`, `TagIcon` respectively — see `table-page-conventions`'s
  "Column header icons" bullet). Category's and Class's *cells* are
  icon-only too, but Account still renders its cell as a `Badge` chip
  (type icon + name) per the bullet above. The header icon and the cell rendering are
  independent choices; don't assume a column's header icon implies its
  cell dropped the `Badge`.
