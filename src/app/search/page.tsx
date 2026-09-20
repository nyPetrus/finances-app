import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";
import { SearchForm } from "./search-form";
import { SearchTable } from "./search-table";
import {
  dateRangeFor,
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

// Rebuilt fresh on every call (rather than reused across .range() pages) —
// Supabase query builders are meant to be executed once each.
function buildQuery(supabase: SupabaseClient, filters: ParsedFilters) {
  let query = supabase.from("transactions").select("*");

  if (filters.account) {
    query = filters.account.op === "is_not"
      ? query.neq("account_id", filters.account.value)
      : query.eq("account_id", filters.account.value);
  }

  if (filters.category) {
    if (filters.category.value === UNCATEGORIZED_VALUE) {
      query = filters.category.op === "is_not"
        ? query.not("category_id", "is", null)
        : query.is("category_id", null);
    } else {
      query = filters.category.op === "is_not"
        ? query.neq("category_id", filters.category.value)
        : query.eq("category_id", filters.category.value);
    }
  }

  if (filters.class) {
    if (filters.class.value === UNCLASSED_VALUE) {
      query = filters.class.op === "is_not"
        ? query.not("class_id", "is", null)
        : query.is("class_id", null);
    } else {
      query = filters.class.op === "is_not"
        ? query.neq("class_id", filters.class.value)
        : query.eq("class_id", filters.class.value);
    }
  }

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
    { data: classes, error: classError },
    results,
  ] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
    supabase.from("classes").select("*").order("name"),
    searchActive ? runSearch(supabase, filters) : Promise.resolve([]),
  ]);

  if (accError) throw new Error(accError.message);
  if (catError) throw new Error(catError.message);
  if (classError) throw new Error(classError.message);

  const allAccounts = (accounts ?? []) as Account[];
  const allCategories = (categories ?? []) as Category[];
  const allClasses = (classes ?? []) as Class[];

  const accountsById = new Map(allAccounts.map((a) => [a.id, a]));
  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));
  const classesById = new Map(allClasses.map((c) => [c.id, c]));

  const sortedResults = [...results].sort((a, b) => {
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Search</h1>

      <SearchForm accounts={allAccounts} categories={allCategories} classes={allClasses} filters={filters} />

      {searchActive ? (
        <SearchTable
          transactions={sortedResults}
          accounts={allAccounts}
          categories={allCategories}
          classes={allClasses}
          sortKey={sortKey}
          sortDir={sortDir}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Set at least one filter above and click Apply to search transactions.
        </p>
      )}
    </div>
  );
}
