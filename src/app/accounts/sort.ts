export const SORT_KEYS = ["account", "name", "source", "type", "lastSync", "balance"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export function isSortKey(value: string | undefined): value is SortKey {
  return !!value && (SORT_KEYS as readonly string[]).includes(value);
}
