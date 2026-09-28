// Shared between the server page (query building) and the client form
// (initializing its fields from the current URL) — no Supabase import here
// so it stays safe to import from a "use client" file.

import { effectiveGordura } from "@/lib/classification";
import type { Gordura } from "@/lib/supabase/types";

export const DESCRIPTION_OPS = ["equal_to", "starts_with", "contains"] as const;
export type DescriptionOp = (typeof DESCRIPTION_OPS)[number];

export const DATE_GRANULARITIES = ["year", "month", "day"] as const;
export type DateGranularity = (typeof DATE_GRANULARITIES)[number];

export const DATE_OPS = ["on", "before", "after"] as const;
export type DateOp = (typeof DATE_OPS)[number];

export const AMOUNT_OPS = ["equal_to", "greater_than", "less_than"] as const;
export type AmountOp = (typeof AMOUNT_OPS)[number];

function isAmountOp(value: string | undefined): value is AmountOp {
  return !!value && (AMOUNT_OPS as readonly string[]).includes(value);
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

// A transaction's effective gordura is always a concrete value now (its own
// override, else its class's default, else DEFAULT_GORDURA — see
// effectiveGordura), so this filter only ever offers/matches Alta/Baixa —
// no "Sem gordura"/unset option any more.
export const GORDURA_VALUES: Gordura[] = ["low", "high"];

export function isGorduraValue(value: string): value is Gordura {
  return value === "high" || value === "low";
}

export const effectiveGorduraValue = effectiveGordura;

export type SearchParams = { [key: string]: string | string[] | undefined };

function one(searchParams: SearchParams, key: string): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

// Every occurrence of `key` — checkbox filters (account/category/class/
// gordura) can appear more than once in the URL, one per checked value.
function many(searchParams: SearchParams, key: string): string[] {
  const value = searchParams[key];
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

export type ParsedFilters = {
  // Empty array means "no filter" for all four of these — a checkbox filter
  // with nothing checked doesn't narrow the search.
  accounts: string[];
  categories: string[];
  classes: string[];
  gorduras: Gordura[];
  description: { op: DescriptionOp; value: string } | null;
  date: { granularity: DateGranularity; op: DateOp; value: string } | null;
  // Compared against the signed amount (expenses are negative), same as
  // what the Amount column displays.
  amount: { op: AmountOp; value: string } | null;
};

export function parseFilters(searchParams: SearchParams): ParsedFilters {
  const descriptionValue = one(searchParams, "description")?.trim();
  const dateValue = one(searchParams, "dateValue");
  const dateGranularity = one(searchParams, "dateGranularity");
  const dateOp = one(searchParams, "dateOp");
  const amountValue = one(searchParams, "amount")?.trim();
  const amountOp = one(searchParams, "amountOp");

  return {
    accounts: many(searchParams, "account"),
    categories: many(searchParams, "category"),
    classes: many(searchParams, "class"),
    gorduras: many(searchParams, "gordura").filter(isGorduraValue),
    description: descriptionValue
      ? { op: isDescriptionOp(one(searchParams, "descriptionOp")) ? (one(searchParams, "descriptionOp") as DescriptionOp) : "contains", value: descriptionValue }
      : null,
    date:
      dateValue && isDateGranularity(dateGranularity)
        ? { granularity: dateGranularity, op: isDateOp(dateOp) ? dateOp : "on", value: dateValue }
        : null,
    amount:
      amountValue && Number.isFinite(Number(amountValue))
        ? { op: isAmountOp(amountOp) ? amountOp : "equal_to", value: amountValue }
        : null,
  };
}

export function hasAnyFilter(filters: ParsedFilters): boolean {
  return !!(
    filters.accounts.length > 0 ||
    filters.categories.length > 0 ||
    filters.classes.length > 0 ||
    filters.gorduras.length > 0 ||
    filters.description ||
    filters.date ||
    filters.amount
  );
}

export const EMPTY_FILTERS: ParsedFilters = {
  accounts: [],
  categories: [],
  classes: [],
  gorduras: [],
  description: null,
  date: null,
  amount: null,
};

// Inverse of parseFilters — the URL shape every filter change pushes.
export function filtersToSearchParams(filters: ParsedFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const value of filters.accounts) params.append("account", value);
  for (const value of filters.categories) params.append("category", value);
  for (const value of filters.classes) params.append("class", value);
  for (const value of filters.gorduras) params.append("gordura", value);
  if (filters.description) {
    params.set("description", filters.description.value);
    params.set("descriptionOp", filters.description.op);
  }
  if (filters.date) {
    params.set("dateGranularity", filters.date.granularity);
    params.set("dateOp", filters.date.op);
    params.set("dateValue", filters.date.value);
  }
  if (filters.amount) {
    params.set("amount", filters.amount.value);
    params.set("amountOp", filters.amount.op);
  }
  return params;
}

// Fixed English labels rather than Intl/toLocaleString, so server- and
// client-rendered chip text always match (no hydration mismatch).
export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026" / "Sep 2026" / "15 Sep 2026" — the display form of a date filter value.
export function formatDateValue(granularity: DateGranularity, value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (granularity === "year" || !month) return String(year);
  if (granularity === "month" || !day) return `${MONTH_LABELS[month - 1]} ${year}`;
  return `${day} ${MONTH_LABELS[month - 1]} ${year}`;
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
