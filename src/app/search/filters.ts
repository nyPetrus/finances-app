// Shared between the server page (query building) and the client form
// (initializing its fields from the current URL) — no Supabase import here
// so it stays safe to import from a "use client" file.

export const EQUALITY_OPS = ["is", "is_not"] as const;
export type EqualityOp = (typeof EQUALITY_OPS)[number];

export const DESCRIPTION_OPS = ["equal_to", "starts_with", "contains"] as const;
export type DescriptionOp = (typeof DESCRIPTION_OPS)[number];

export const DATE_GRANULARITIES = ["year", "month", "day"] as const;
export type DateGranularity = (typeof DATE_GRANULARITIES)[number];

export const DATE_OPS = ["on", "before", "after"] as const;
export type DateOp = (typeof DATE_OPS)[number];

function isEqualityOp(value: string | undefined): value is EqualityOp {
  return !!value && (EQUALITY_OPS as readonly string[]).includes(value);
}

function isDescriptionOp(value: string | undefined): value is DescriptionOp {
  return !!value && (DESCRIPTION_OPS as readonly string[]).includes(value);
}

function isDateGranularity(value: string | undefined): value is DateGranularity {
  return !!value && (DATE_GRANULARITIES as readonly string[]).includes(value);
}

function isDateOp(value: string | undefined): value is DateOp {
  return !!value && (DATE_OPS as readonly string[]).includes(value);
}

// "uncategorized"/"unclassed" are pseudo-ids representing "no category" /
// "no class" — never real row ids, so they can't collide with one.
export const UNCATEGORIZED_VALUE = "uncategorized";
export const UNCLASSED_VALUE = "unclassed";

export type SearchParams = { [key: string]: string | string[] | undefined };

function one(searchParams: SearchParams, key: string): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export type ParsedFilters = {
  account: { op: EqualityOp; value: string } | null;
  category: { op: EqualityOp; value: string } | null;
  class: { op: EqualityOp; value: string } | null;
  description: { op: DescriptionOp; value: string } | null;
  date: { granularity: DateGranularity; op: DateOp; value: string } | null;
};

export function parseFilters(searchParams: SearchParams): ParsedFilters {
  const accountValue = one(searchParams, "account");
  const categoryValue = one(searchParams, "category");
  const classValue = one(searchParams, "class");
  const descriptionValue = one(searchParams, "description")?.trim();
  const dateValue = one(searchParams, "dateValue");
  const dateGranularity = one(searchParams, "dateGranularity");
  const dateOp = one(searchParams, "dateOp");

  return {
    account: accountValue
      ? { op: isEqualityOp(one(searchParams, "accountOp")) ? (one(searchParams, "accountOp") as EqualityOp) : "is", value: accountValue }
      : null,
    category: categoryValue
      ? { op: isEqualityOp(one(searchParams, "categoryOp")) ? (one(searchParams, "categoryOp") as EqualityOp) : "is", value: categoryValue }
      : null,
    class: classValue
      ? { op: isEqualityOp(one(searchParams, "classOp")) ? (one(searchParams, "classOp") as EqualityOp) : "is", value: classValue }
      : null,
    description: descriptionValue
      ? { op: isDescriptionOp(one(searchParams, "descriptionOp")) ? (one(searchParams, "descriptionOp") as DescriptionOp) : "contains", value: descriptionValue }
      : null,
    date:
      dateValue && isDateGranularity(dateGranularity)
        ? { granularity: dateGranularity, op: isDateOp(dateOp) ? dateOp : "on", value: dateValue }
        : null,
  };
}

export function hasAnyFilter(filters: ParsedFilters): boolean {
  return !!(filters.account || filters.category || filters.class || filters.description || filters.date);
}

// Half-open [start, end) range covering the whole year/month/day the
// filter's value refers to, in plain "YYYY-MM-DD" strings — safe to compare
// directly against the `date` timestamp column the same way
// transactions/page.tsx's own month-scoping already does.
export function dateRangeFor(granularity: DateGranularity, value: string): { start: string; end: string } | null {
  if (granularity === "year") {
    const year = Number(value);
    if (!Number.isInteger(year)) return null;
    return { start: `${year}-01-01`, end: `${year + 1}-01-01` };
  }

  if (granularity === "month") {
    const [year, month] = value.split("-").map(Number);
    if (!year || !month) return null;
    const endDate = new Date(year, month, 1);
    return {
      start: `${value}-01`,
      end: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-01`,
    };
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const endDate = new Date(year, month - 1, day + 1);
  return {
    start: value,
    end: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`,
  };
}
