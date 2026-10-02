"use client";

import { useSyncExternalStore } from "react";

// Matches Tailwind's `sm` breakpoint: below it counts as a phone.
const MOBILE_QUERY = "(max-width: 639px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * True on phone-width screens. Always false during server rendering, so
 * anything that must look right before hydration should use `sm:` classes
 * instead.
 */
export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}
