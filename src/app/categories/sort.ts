// "name" sorts both levels; "type" and "classes" sort the category rows
// (classes stay by name inside each), "autonomy" sorts the class rows inside
// each category (categories stay by name).
export const SORT_KEYS = ["name", "type", "classes", "autonomy"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export function isSortKey(value: string | undefined): value is SortKey {
  return !!value && (SORT_KEYS as readonly string[]).includes(value);
}
