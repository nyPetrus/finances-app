// Shared between the server page (query building) and the client form
// (initializing its fields from the current URL) — no Supabase import here
// so it stays safe to import from a "use client" file.

import { effectiveGordura, GORDURA_LABELS } from "@/lib/classification";
import type { Class, Gordura, Transaction } from "@/lib/supabase/types";

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

// A transaction's effective gordura (its own override, else its class's
// default — see effectiveGordura), with "none" standing in for a
// transaction that has neither, same "none" bucket concept as the
// Dashboard's monthly breakdown table.
export type GorduraValue = Gordura | "none";
export const GORDURA_VALUES: GorduraValue[] = ["low", "high", "none"];
export const GORDURA_VALUE_LABELS: Record<GorduraValue, string> = { ...GORDURA_LABELS, none: "Sem gordura" };

function isGorduraValue(value: string): value is GorduraValue {
  return value === "high" || value === "low" || value === "none";
}

export function effectiveGorduraValue(
  transaction: Pick<Transaction, "gordura" | "class_id">,
  classesById: Map<string, Class>,
): GorduraValue {
  return effectiveGordura(transaction, classesById) ?? "none";
}

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
  gorduras: GorduraValue[];
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
