"use client";

import { useEffect, useState } from "react";

/**
 * Per-browser column visibility + order, persisted to localStorage under
 * `${storageKey}-hidden` / `${storageKey}-order`. `storageKey` should be
 * unique per table (e.g. "accounts-table", "transactions-table").
 */
export function useColumnPreferences<K extends string>(storageKey: string, defaultOrder: readonly K[]) {
  const hiddenStorageKey = `${storageKey}-hidden-columns`;
  const orderStorageKey = `${storageKey}-column-order`;

  const [hidden, setHidden] = useState<Set<K>>(new Set());
  const [order, setOrder] = useState<K[]>([...defaultOrder]);

  useEffect(() => {
    try {
      const storedHidden = localStorage.getItem(hiddenStorageKey);
      if (storedHidden) setHidden(new Set(JSON.parse(storedHidden)));

      const storedOrder = localStorage.getItem(orderStorageKey);
      if (storedOrder) {
        const parsed = JSON.parse(storedOrder) as K[];
        // Reconcile against the current column set, so a stored order from
        // before a column was added/removed doesn't drop or lose it.
        const known = parsed.filter((key) => defaultOrder.includes(key));
        const missing = defaultOrder.filter((key) => !known.includes(key));
        setOrder([...known, ...missing]);
      }
    } catch {
      // ignore malformed/inaccessible storage
    }
    // Only load once per mount — storageKey/defaultOrder are static per page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(key: K) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(hiddenStorageKey, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function move(key: K, direction: -1 | 1) {
    setOrder((prev) => {
      const index = prev.indexOf(key);
      const swapWith = index + direction;
      if (index === -1 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      try {
        localStorage.setItem(orderStorageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return { hidden, order, toggle, move };
}
