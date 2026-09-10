"use client";

import { useState } from "react";

export function useRowSelection<T>(rows: T[], getId: (row: T) => string) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map(getId)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clear() {
    setSelected(new Set());
  }

  const selectedRows = rows.filter((row) => selected.has(getId(row)));
  const soleSelectedRow = selected.size === 1 ? selectedRows[0] : null;

  return {
    selected,
    allSelected,
    someSelected,
    toggleAll,
    toggleOne,
    clear,
    selectedRows,
    soleSelectedRow,
  };
}
