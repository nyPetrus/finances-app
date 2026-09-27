import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchClasses } from "@/lib/supabase/fetch-classes";
import type { Account, Category, Transaction } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { SearchForm } from "./search-form";
import { SearchTable } from "./search-table";
import {
  dateRangeFor,
  effectiveGorduraValue,
  hasAnyFilter,
  parseFilters,
  UNCATEGORIZED_VALUE,
  UNCLASSED_VALUE,
  type ParsedFilters,
  type SearchParams,
} from "./filters";
import { isSortKey, type SortKey } from "./sort";

// ilike treats `%`/`_` as wildcards — escape any the user typed literally so
// e.g. searching for "50%" doesn't turn into a wildcard match.
function escapeIlike(value: string) {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}

// Matches search-table.tsx's own Amount column formatting (2 decimals, no
// currency symbol — see amount-color-conventions).
function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

// Checkbox filters (account/category/class) are OR semantics: match any
// checked value. `noneValue`, when present among `values`, means "column is
// null" (Uncategorized/Unclassed) — combined with real ids via `.or()` when
// both are checked at once, since `.in()` alone never matches NULL rows.
function applyCheckboxFilter<
  Q extends { in(column: string, values: string[]): Q; is(column: string, value: null): Q; or(filters: string): Q },
>(query: Q, column: string, values: string[], noneValue?: string): Q {
  if (values.length === 0) return query;
  const realIds = noneValue ? values.filter((v) => v !== noneValue) : values;
  const includeNone = !!noneValue && values.includes(noneValue);

  if (includeNone && realIds.length > 0) {
    return query.or(`${column}.is.null,${column}.in.(${realIds.join(",")})`);
  }
  if (includeNone) {
    return query.is(column, null);
  }
  return query.in(column, realIds);
}

// Rebuilt fresh on every call (rather than reused across .range() pages) —
// Supabase query builders are meant to be executed once each.
function buildQuery(supabase: SupabaseClient, filters: ParsedFilters) {
  let query = supabase.from("transactions").select("*");

  query = applyCheckboxFilter(query, "account_id", filters.accounts);
  query = applyCheckboxFilter(query, "category_id", filters.categories, UNCATEGORIZED_VALUE);
  query = applyCheckboxFilter(query, "class_id", filters.classes, UNCLASSED_VALUE);

  if (filters.description) {
    const escaped = escapeIlike(filters.description.value.trim());
    const pattern =
      filters.description.op === "starts_with"
        ? `${escaped}%`
        : filters.description.op === "contains"
          ? `%${escaped}%`
          : escaped;
    query = query.ilike("description", pattern);
  }

  if (filters.date) {
    const range = dateRangeFor(filters.date.granularity, filters.date.value);
    if (range) {
      if (filters.date.op === "on") query = query.gte("date", range.start).lt("date", range.end);
      else if (filters.date.op === "before") query = query.lt("date", range.start);
      else query = query.gte("date", range.end);
    }
  }

  if (filters.amount) {
    const amount = Number(filters.amount.value);
    if (filters.amount.op === "greater_than") query = query.gt("amount", amount);
    else if (filters.amount.op === "less_than") query = query.lt("amount", amount);
    else query = query.eq("amount", amount);
  }

  return query;
}

// PostgREST caps a single select at 1000 rows — a broad search (e.g. just
// "Account is X" over years of history) can easily exceed that, so page
// through with .range() rather than a single .select() (see PITFALLS.md).
async function runSearch(supabase: SupabaseClient, filters: ParsedFilters): Promise<Transaction[]> {
  const pageSize = 1000;
  const rows: Transaction[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await buildQuery(supabase, filters).range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    rows.push(...(data as Transaction[]));

    if (data.length < pageSize) break;
  }

  return rows;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = parseFilters(resolvedSearchParams);
  const searchActive = hasAnyFilter(filters);

  const sortParam = typeof resolvedSearchParams.sort === "string" ? resolvedSearchParams.sort : undefined;
  const dirParam = typeof resolvedSearchParams.dir === "string" ? resolvedSearchParams.dir : undefined;
  const sortKey: SortKey = isSortKey(sortParam) ? sortParam : "date";
  const sortDir: "asc" | "desc" = dirParam === "asc" ? "asc" : "desc";

  const supabase = await createClient();

  const [
    { data: accounts, error: accError },
    { data: categories, error: catError },
    allClasses,
    results,
  ] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
    fetchClasses(supabase),
    searchActive ? runSearch(supabase, filters) : Promise.resolve([]),
  ]);

  if (accError) throw new Error(accError.message);
  if (catError) throw new Error(catError.message);

  const allAccounts = (accounts ?? []) as Account[];
  const allCategories = (categories ?? []) as Category[];

  const accountsById = new Map(allAccounts.map((a) => [a.id, a]));
  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));
  const classesById = new Map(allClasses.map((c) => [c.id, c]));

  // Gordura can't be pushed into the Supabase query — it's a transaction's
  // *effective* gordura (its own override, else its class's default), which
  // needs the class join, not a plain column comparison. `runSearch` already
  // paged through every row matching the other filters, so filtering the
  // full result set here in JS is still correct (no silent 1000-row
  // truncation, see PITFALLS.md), just not pushed down to Postgres.
  const gorduraFiltered =
    filters.gorduras.length > 0
      ? results.filter((t) => filters.gorduras.includes(effectiveGorduraValue(t, classesById)))
      : results;

  const sortedResults = [...gorduraFiltered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at);
        break;
      case "description":
        cmp = a.description.localeCompare(b.description);
        break;
      case "account":
        cmp = (accountsById.get(a.account_id)?.label ?? "").localeCompare(
          accountsById.get(b.account_id)?.label ?? "",
        );
        break;
      case "category": {
        const aName = (a.category_id ? categoriesById.get(a.category_id)?.name : undefined) ?? "";
        const bName = (b.category_id ? categoriesById.get(b.category_id)?.name : undefined) ?? "";
        cmp = aName.localeCompare(bName);
        break;
      }
      case "class": {
        const aName = (a.class_id ? classesById.get(a.class_id)?.name : undefined) ?? "";
        const bName = (b.class_id ? classesById.get(b.class_id)?.name : undefined) ?? "";
        cmp = aName.localeCompare(bName);
        break;
      }
      case "amount":
        cmp = a.amount - b.amount;
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  // Signed sum, same as the Amount column and every other aggregate in the
  // app (see amount-color-conventions/dashboard-monthly-breakdown.ts) — a
  // transfer's two legs net toward 0 rather than being excluded or summed
  // by magnitude.
  const totalAmount = sortedResults.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Search</h1>

      <SearchForm accounts={allAccounts} categories={allCategories} classes={allClasses} filters={filters} />

      {searchActive && (
        <>
          <div className="flex items-center gap-2 rounded-md border px-4 py-3 text-sm">
            <span className="font-medium">
              {sortedResults.length === 1 ? "1 transaction" : `${sortedResults.length} transactions`}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">Total:</span>
            <span className={cn("font-medium", totalAmount >= 0 && "text-emerald-600")}>
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <SearchTable
            transactions={sortedResults}
            accounts={allAccounts}
            categories={allCategories}
            classes={allClasses}
            sortKey={sortKey}
            sortDir={sortDir}
          />
        </>
      )}
    </div>
  );
}
