---
name: button-hover-names
description: Use when adding or changing any button, icon button, dialog/dropdown trigger, or other clickable control anywhere in the app — every button whose name isn't fully visible as text (icon-only, symbol-only like "<"/"→", or an icon swatch) must show its name on hover via a `title` attribute, paired with a matching `aria-label`.
---

# Button hover names

**Rule (per explicit user request): hovering any button shows its name.**
Every button whose name isn't already fully visible as text must carry a
`title` (the browser's native hover tooltip) naming what it does, plus an
`aria-label` with the **same** text for screen readers.

- **Applies to**: icon-only buttons (`<Button size="icon*">` with just a
  lucide icon), symbol-only ones (Dashboard's `<` / `>` year nav, Budget's
  `← 2025` / `2026 →`), chip-remove "×" buttons, pager chevrons, the
  sidebar collapse toggle, the icon swatches in `IconSwatchPicker`, and
  triggers rendered through `render={<Button ... />}` (`DialogTrigger`,
  `DropdownMenuTrigger` — e.g. every "+" Add trigger, `ColumnsMenu`, the
  "⋮" `RowActionsMenu`).
- **Doesn't need a `title`**: a button whose visible text *is* its name
  ("Save", "Create", "Show inactive (3)", "Apply") — a tooltip repeating
  the label adds nothing. Dropdown **menu items** also show their own
  icon + text label, so they don't need one either.
- **Icon-only table headers** get their hover name from
  `ColumnHeaderIcon` (`src/components/column-header-icon.tsx`), which puts
  a `title` on the icon-only case — keep using it rather than a bare icon.
- **Wording**: the plain action, capitalized like the rest of the UI —
  "Add category", "Apply rules", "Actions", "Remove Class filter",
  "Previous year (2025)". Dynamic labels are fine as long as `title` and
  `aria-label` stay identical (write both from the same expression).
- **Put `title` on its own line right after `aria-label`**, matching the
  existing code:
  ```tsx
  <Button
    variant="ghost"
    size="icon-sm"
    onClick={...}
    aria-label="Apply rules"
    title="Apply rules"
  >
    <WandSparklesIcon />
  </Button>
  ```

**Checking the whole app**: scan every `<Button`/`<button` opening tag in
`src/` (outside `src/components/ui/`) for ones with no `title=`, then look
at what each renders — anything showing only an icon or a symbol is a
violation. As of 2026-09-29 every such button has a `title`.
