"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Matches Tailwind's `sm` breakpoint: below it counts as a phone.
const MOBILE_QUERY = "(max-width: 639px)";

function subscribeToMobile(onChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Per-browser column visibility + order, persisted to localStorage under
 * `${storageKey}-hidden` / `${storageKey}-order`. `storageKey` should be
 * unique per table (e.g. "accounts-table", "transactions-table").
 *
 * On phone-width screens the hidden set is tracked separately (under
 * `${storageKey}-mobile-hidden-columns`) and defaults to `mobileHidden`, so
 * low-priority columns start hidden there without touching the desktop
 * preferences. Order is shared between the two.
 */
export function useColumnPreferences<K extends string>(
  storageKey: string,
  defaultOrder: readonly K[],
  mobileHidden: readonly K[] = [],
) {
  const isMobile = useSyncExternalStore(
    subscribeToMobile,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
  const hiddenStorageKey = isMobile ? `${storageKey}-mobile-hidden-columns` : `${storageKey}-hidden-columns`;
  const orderStorageKey = `${storageKey}-column-order`;

  const [hidden, setHidden] = useState<Set<K>>(new Set());
  const [order, setOrder] = useState<K[]>([...defaultOrder]);

  useEffect(() => {
    const fallback = new Set<K>(isMobile ? mobileHidden : []);
    try {
      const storedHidden = localStorage.getItem(hiddenStorageKey);
      setHidden(storedHidden ? new Set(JSON.parse(storedHidden)) : fallback);
    } catch {
      setHidden(fallback);
    }
    // Reload whenever the viewport crosses the phone breakpoint;
    // mobileHidden is static per page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenStorageKey]);

  useEffect(() => {
    try {
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
