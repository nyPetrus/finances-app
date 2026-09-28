"use client";

import { useState } from "react";

// Rows that can be deactivated instead of deleted (categories, classes,
// accounts, transactions) hide their inactive rows by default unless the
// user asks to see them. `isActive` is a selector rather than a fixed
// `is_active` field so this works for tables keyed on a differently-named
// or inverted flag too (Transaction's `is_hidden`, for instance, passes
// `(t) => !t.is_hidden`).
export function useInactiveFilter<T>(rows: T[], isActive: (row: T) => boolean) {
  const [showInactive, setShowInactive] = useState(false);
  const inactiveCount = rows.filter((row) => !isActive(row)).length;
  const visibleRows = showInactive ? rows : rows.filter(isActive);
  return { showInactive, setShowInactive, inactiveCount, visibleRows };
}
