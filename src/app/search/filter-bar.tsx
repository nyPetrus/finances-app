"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import type { Account, Category, Class } from "@/lib/supabase/types";
import { GORDURA_SYMBOLS, gorduraOptionLabel } from "@/lib/classification";
import { cn } from "@/lib/utils";
import {
  EMPTY_FILTERS,
  filtersToSearchParams,
  formatDateValue,
  GORDURA_VALUES,
  hasAnyFilter,
  isGorduraValue,
  UNCATEGORIZED_VALUE,
  UNCLASSED_VALUE,
  type AmountOp,
  type DescriptionOp,
  type ParsedFilters,
} from "./filters";
import { CheckboxEditor, DateEditor, OperatorEditor, type Option } from "./filter-editors";

type Field = "account" | "category" | "class" | "gordura" | "description" | "date" | "amount";
type CheckboxField = "account" | "category" | "class" | "gordura";

// Also the chip order in the bar.
const FIELDS: { field: Field; label: string }[] = [
  { field: "account", label: "Account" },
  { field: "category", label: "Category" },
  { field: "class", label: "Class" },
  { field: "gordura", label: "Gordura" },
  { field: "description", label: "Description" },
  { field: "date", label: "Date" },
  { field: "amount", label: "Amount" },
];
const FIELD_LABELS = Object.fromEntries(FIELDS.map((f) => [f.field, f.label])) as Record<Field, string>;
const CHECKBOX_FIELDS: CheckboxField[] = ["account", "category", "class", "gordura"];

const DESCRIPTION_OPS: { value: DescriptionOp; label: string; chip: string }[] = [
  { value: "contains", label: "Contains", chip: "contains" },
  { value: "starts_with", label: "Starts with", chip: "starts with" },
  { value: "equal_to", label: "Equal to", chip: "equals" },
];

const AMOUNT_OPS: { value: AmountOp; label: string; chip: string }[] = [
  { value: "equal_to", label: "Equal to", chip: "=" },
  { value: "greater_than", label: "Greater than", chip: ">" },
  { value: "less_than", label: "Less than", chip: "<" },
];

const MAX_VALUE_SUGGESTIONS = 6;

type Suggestion =
  | { kind: "field"; field: Field }
  | { kind: "description"; value: string }
  | { kind: "amount"; value: string }
  | { kind: "value"; field: CheckboxField; option: Option };

function checkboxValues(filters: ParsedFilters, field: CheckboxField): string[] {
  if (field === "account") return filters.accounts;
  if (field === "category") return filters.categories;
  if (field === "class") return filters.classes;
  return filters.gorduras;
}

function withCheckboxValues(filters: ParsedFilters, field: CheckboxField, values: string[]): ParsedFilters {
  if (field === "account") return { ...filters, accounts: values };
  if (field === "category") return { ...filters, categories: values };
  if (field === "class") return { ...filters, classes: values };
  return { ...filters, gorduras: values.filter(isGorduraValue) };
}

function withoutField(filters: ParsedFilters, field: Field): ParsedFilters {
  if (field === "description") return { ...filters, description: null };
  if (field === "date") return { ...filters, date: null };
  if (field === "amount") return { ...filters, amount: null };
  return withCheckboxValues(filters, field, []);
}

function isActive(filters: ParsedFilters, field: Field): boolean {
  if (field === "description") return !!filters.description;
  if (field === "date") return !!filters.date;
  if (field === "amount") return !!filters.amount;
  return checkboxValues(filters, field).length > 0;
}

/**
 * Supabase-style single-line filter bar: each applied filter is a chip
 * inside one box, and a text input at the end adds more. Typing either
 * narrows the field list or offers ready-made filters (Description contains
 * "…", Amount = …, or a matching account/category/class name); Enter picks
 * the highlighted one. Every finished edit applies immediately by pushing
 * the URL — there's no separate Apply/Clear for the whole bar.
 */
export function SearchFilterBar({
  accounts,
  categories,
  classes,
  filters: urlFilters,
}: {
  accounts: Account[];
  categories: Category[];
  classes: Class[];
  filters: ParsedFilters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local copy so a chip appears/disappears instantly instead of waiting
  // for the server round-trip; re-synced whenever the URL's filters change.
  const [filters, setFilters] = useState(urlFilters);
  const [prevUrlFilters, setPrevUrlFilters] = useState(urlFilters);
  if (urlFilters !== prevUrlFilters) {
    setPrevUrlFilters(urlFilters);
    setFilters(urlFilters);
  }

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Field | null>(null);
  const [text, setText] = useState("");
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const optionsByField = useMemo<Record<CheckboxField, Option[]>>(
    () => ({
      account: accounts.map((account) => ({ value: account.id, label: account.label ?? account.name })),
      category: [
        { value: UNCATEGORIZED_VALUE, label: "Uncategorized" },
        ...categories.map((category) => ({ value: category.id, label: category.name })),
      ],
      class: [
        { value: UNCLASSED_VALUE, label: "Unclassed" },
        ...classes.map((classItem) => ({ value: classItem.id, label: classItem.name })),
      ],
      gordura: GORDURA_VALUES.map((value) => ({
        value,
        label: gorduraOptionLabel(value),
        chip: GORDURA_SYMBOLS[value],
      })),
    }),
    [accounts, categories, classes],
  );

  // Close on any press outside the bar + panel. The panel renders inline
  // (no portal), so "outside the container" is exactly "outside both".
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setEditing(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    setEditing(null);
  }

  function apply(next: ParsedFilters) {
    setFilters(next);
    setText("");
    close();

    const params = filtersToSearchParams(next);
    // Carry the table's current sort along, same as the old Apply button did.
    if (hasAnyFilter(next)) {
      const sort = searchParams.get("sort");
      const dir = searchParams.get("dir");
      if (sort) params.set("sort", sort);
      if (dir) params.set("dir", dir);
    }
    // Not bare `/search` when empty — that means "open on the current
    // month" (see page.tsx); `cleared=1` keeps a deliberately emptied
    // search empty. parseFilters ignores the param.
    const query = params.toString();
    startTransition(() => router.push(query ? `/search?${query}` : "/search?cleared=1"));
  }

  function openEditor(field: Field) {
    setEditing(field);
    setOpen(true);
    setText("");
  }

  function backToList() {
    setEditing(null);
    inputRef.current?.focus();
  }

  function labelsFor(field: CheckboxField, values: string[]): string {
    const names = values.map((v) => {
      const option = optionsByField[field].find((o) => o.value === v);
      return option?.chip ?? option?.label ?? "?";
    });
    return names.length <= 2 ? names.join(", ") : `${names[0]}, ${names[1]} +${names.length - 2}`;
  }

  // The value half of a chip / of a field row's "currently set" hint.
  function summary(field: Field): string {
    if (field === "description" && filters.description) {
      const op = DESCRIPTION_OPS.find((o) => o.value === filters.description!.op)?.chip;
      return `${op} "${filters.description.value}"`;
    }
    if (field === "amount" && filters.amount) {
      const op = AMOUNT_OPS.find((o) => o.value === filters.amount!.op)?.chip;
      return `${op} ${filters.amount.value}`;
    }
    if (field === "date" && filters.date) {
      const formatted = formatDateValue(filters.date.granularity, filters.date.value);
      return filters.date.op === "on" ? formatted : `${filters.date.op} ${formatted}`;
    }
    if (field !== "description" && field !== "amount" && field !== "date") {
      return labelsFor(field, checkboxValues(filters, field));
    }
    return "";
  }

  // `Description contains "uber"`, `Amount > -50`, `Date before Sep 2026`
  // read as a phrase; list-style values take a colon: `Account: Nubank`,
  // `Date: Sep 2026`.
  function readsAsSentence(field: Field): boolean {
    return field === "description" || field === "amount" || (field === "date" && filters.date?.op !== "on");
  }

  const activeFields = FIELDS.filter((f) => isActive(filters, f.field)).map((f) => f.field);

  const suggestions = useMemo<Suggestion[]>(() => {
    const raw = text.trim();
    const query = raw.toLowerCase();
    const fieldMatches: Suggestion[] = FIELDS.filter((f) => !query || f.label.toLowerCase().includes(query)).map(
      (f) => ({ kind: "field", field: f.field }),
    );
    if (!query) return fieldMatches;

    const quick: Suggestion[] = [];
    const asNumber = raw.replace(",", ".");
    const numeric = Number.isFinite(Number(asNumber));
    if (numeric) quick.push({ kind: "amount", value: asNumber });
    quick.push({ kind: "description", value: raw });

    const valueMatches: Suggestion[] = [];
    for (const field of CHECKBOX_FIELDS) {
      const current = checkboxValues(filters, field);
      for (const option of optionsByField[field]) {
        if (valueMatches.length >= MAX_VALUE_SUGGESTIONS) break;
        if (!current.includes(option.value) && option.label.toLowerCase().includes(query)) {
          valueMatches.push({ kind: "value", field, option });
        }
      }
    }

    // Typing the start of a field name ("cat", "amo") most likely means
    // "that field", so it goes first; otherwise the ready-made filters lead,
    // with Description contains "…" as the plain-typing default.
    const fieldFirst = FIELDS.some((f) => f.label.toLowerCase().startsWith(query));
    return fieldFirst ? [...fieldMatches, ...quick, ...valueMatches] : [...quick, ...valueMatches, ...fieldMatches];
  }, [text, filters, optionsByField]);

  function choose(suggestion: Suggestion) {
    if (suggestion.kind === "field") openEditor(suggestion.field);
    else if (suggestion.kind === "description")
      apply({ ...filters, description: { op: "contains", value: suggestion.value } });
    else if (suggestion.kind === "amount") apply({ ...filters, amount: { op: "equal_to", value: suggestion.value } });
    else
      apply(
        withCheckboxValues(filters, suggestion.field, [
          ...checkboxValues(filters, suggestion.field),
          suggestion.option.value,
        ]),
      );
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setEditing(null);
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setHighlight((h) => (h + delta + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const suggestion = suggestions[Math.min(highlight, suggestions.length - 1)];
      if (suggestion) choose(suggestion);
    } else if (event.key === "Backspace" && text === "" && activeFields.length > 0) {
      apply(withoutField(filters, activeFields[activeFields.length - 1]));
    } else if (event.key === "Escape") {
      close();
    }
  }

  function renderEditor(field: Field) {
    const title = FIELD_LABELS[field];
    if (field === "description") {
      return (
        <OperatorEditor
          title={title}
          ops={DESCRIPTION_OPS}
          initial={filters.description ?? { op: "contains", value: "" }}
          placeholder="e.g. uber"
          onApply={(description) => apply({ ...filters, description })}
          onBack={backToList}
        />
      );
    }
    if (field === "amount") {
      return (
        <OperatorEditor
          title={title}
          ops={AMOUNT_OPS}
          initial={filters.amount ?? { op: "equal_to", value: "" }}
          numeric
          placeholder="-50.00"
          onApply={(amount) => apply({ ...filters, amount })}
          onBack={backToList}
        />
      );
    }
    if (field === "date") {
      return <DateEditor initial={filters.date} onApply={(date) => apply({ ...filters, date })} onBack={backToList} />;
    }
    return (
      <CheckboxEditor
        title={title}
        options={optionsByField[field]}
        initial={checkboxValues(filters, field)}
        onApply={(values) => apply(withCheckboxValues(filters, field, values))}
        onBack={backToList}
      />
    );
  }

  function renderSuggestion(suggestion: Suggestion) {
    if (suggestion.kind === "field") {
      const active = isActive(filters, suggestion.field);
      return (
        <>
          <span>{FIELD_LABELS[suggestion.field]}</span>
          {active && <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">{summary(suggestion.field)}</span>}
        </>
      );
    }
    if (suggestion.kind === "description") {
      return (
        <span className="truncate">
          <span className="text-muted-foreground">Description contains </span>
          <span className="font-medium">&quot;{suggestion.value}&quot;</span>
        </span>
      );
    }
    if (suggestion.kind === "amount") {
      return (
        <span className="truncate">
          <span className="text-muted-foreground">Amount = </span>
          <span className="font-medium">{suggestion.value}</span>
        </span>
      );
    }
    return (
      <span className="truncate">
        <span className="text-muted-foreground">{FIELD_LABELS[suggestion.field]}: </span>
        <span className="font-medium">{suggestion.option.label}</span>
      </span>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
    >
      <div
        onClick={() => {
          // Also reopens the panel when the input already has focus (and
          // so won't fire onFocus again) after a filter was just applied.
          inputRef.current?.focus();
          setOpen(true);
        }}
        className={cn(
          "flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-input px-2 py-1 transition-colors dark:bg-input/30",
          open && "border-ring ring-3 ring-ring/50",
        )}
      >
        {isPending ? (
          <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Searching" />
        ) : (
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}

        {activeFields.map((field) => (
          <span
            key={field}
            className={cn(
              "inline-flex max-w-full items-center rounded-md bg-muted text-xs",
              editing === field && "ring-2 ring-ring/50",
            )}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openEditor(field);
              }}
              className="truncate py-1 pl-2"
              title={`Edit ${FIELD_LABELS[field]} filter`}
            >
              <span className="text-muted-foreground">
                {FIELD_LABELS[field]}
                {readsAsSentence(field) ? " " : ": "}
              </span>
              <span className="font-medium">{summary(field)}</span>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                apply(withoutField(filters, field));
              }}
              aria-label={`Remove ${FIELD_LABELS[field]} filter`}
              className="rounded-md px-1.5 py-1 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setHighlight(0);
            setEditing(null);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setEditing(null);
          }}
          onKeyDown={onInputKeyDown}
          placeholder={activeFields.length > 0 ? "Add filter…" : "Filter by account, category, description… or just type"}
          aria-label="Add filter"
          aria-expanded={open}
          role="combobox"
          aria-controls="search-filter-panel"
          className="h-7 min-w-32 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
        />

        {activeFields.length > 0 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              apply(EMPTY_FILTERS);
            }}
            aria-label="Clear all filters"
            title="Clear all filters"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>

      {open && (
        <div
          id="search-filter-panel"
          className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg bg-popover p-2 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 sm:w-80"
        >
          {editing ? (
            renderEditor(editing)
          ) : (
            <div role="listbox" aria-label="Filters" className="flex max-h-72 flex-col overflow-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={
                    suggestion.kind === "value"
                      ? `value-${suggestion.field}-${suggestion.option.value}`
                      : suggestion.kind === "field"
                        ? `field-${suggestion.field}`
                        : suggestion.kind
                  }
                  type="button"
                  role="option"
                  aria-selected={index === highlight}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(suggestion)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
                    index === highlight && "bg-muted",
                  )}
                >
                  {renderSuggestion(suggestion)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
