"use client";

import { useState } from "react";

// Categories and classes can be deactivated instead of deleted; their list
// pages hide inactive rows unless the user asks to see them.
export function useInactiveFilter<T extends { is_active: boolean }>(rows: T[]) {
  const [showInactive, setShowInactive] = useState(false);
  const inactiveCount = rows.filter((row) => !row.is_active).length;
  const visibleRows = showInactive ? rows : rows.filter((row) => row.is_active);
  return { showInactive, setShowInactive, inactiveCount, visibleRows };
}
