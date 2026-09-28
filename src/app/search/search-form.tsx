"use client";

import { useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckboxSelect } from "@/components/checkbox-select";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account, Category, Class } from "@/lib/supabase/types";
import {
  GORDURA_VALUE_LABELS,
  GORDURA_VALUES,
  UNCATEGORIZED_VALUE,
  UNCLASSED_VALUE,
  type AmountOp,
  type DateGranularity,
  type DateOp,
  type DescriptionOp,
  type ParsedFilters,
} from "./filters";

const DESCRIPTION_OP_LABELS: Record<DescriptionOp, string> = {
  equal_to: "Equal to",
  starts_with: "Starts with",
  contains: "Contains",
};

const DATE_GRANULARITY_LABELS: Record<DateGranularity, string> = {
  year: "Year",
  month: "Month",
  day: "Day",
};

const DATE_OP_LABELS: Record<DateOp, string> = {
  on: "On",
  before: "Before",
  after: "After",
};

const AMOUNT_OP_LABELS: Record<AmountOp, string> = {
  equal_to: "Equal to",
  greater_than: "Greater than",
  less_than: "Less than",
};

/**
 * Field name rendered muted inside a control ("Description: Contains"),
 * instead of an external <Label> column — saves a full line per filter on
 * mobile. Stays visible after a value is picked, unlike a placeholder.
 */
function InlineLabel({ children }: { children: string }) {
  return <span className="shrink-0 text-muted-foreground">{children}:</span>;
}

/**
 * One bordered box holding an operator <Select> and its value <Input>, so
 * the pair reads as a single field: `[Description: Contains ▾ | e.g. uber]`.
 * The box owns the border and the focus ring; the children drop their own
 * (see OPERATOR_TRIGGER_CLASS / OPERATOR_INPUT_CLASS), with a thin divider
 * after the trigger.
 */
function OperatorField({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-8 w-full min-w-0 items-center rounded-lg border border-input transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
      {children}
    </div>
  );
}

const OPERATOR_TRIGGER_CLASS =
  "h-full data-[size=default]:h-full shrink-0 rounded-none rounded-l-lg border-0 border-r border-input bg-transparent focus-visible:border-input focus-visible:ring-0 dark:bg-transparent";

const OPERATOR_INPUT_CLASS =
  "h-full flex-1 rounded-none rounded-r-lg border-0 bg-transparent focus-visible:ring-0 dark:bg-transparent";

export function SearchForm({
  accounts,
  categories,
  classes,
  filters,
}: {
  accounts: Account[];
  categories: Category[];
  classes: Class[];
  filters: ParsedFilters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accountValues, setAccountValues] = useState<Set<string>>(new Set(filters.accounts));
  const [categoryValues, setCategoryValues] = useState<Set<string>>(new Set(filters.categories));
  const [classValues, setClassValues] = useState<Set<string>>(new Set(filters.classes));
  const [gorduraValues, setGorduraValues] = useState<Set<string>>(new Set(filters.gorduras));

  const [descriptionValue, setDescriptionValue] = useState(filters.description?.value ?? "");
  const [descriptionOp, setDescriptionOp] = useState<DescriptionOp>(filters.description?.op ?? "contains");

  const [dateGranularity, setDateGranularity] = useState<DateGranularity>(filters.date?.granularity ?? "day");
  const [dateOp, setDateOp] = useState<DateOp>(filters.date?.op ?? "on");
  const [dateValue, setDateValue] = useState(filters.date?.value ?? "");

  const [amountOp, setAmountOp] = useState<AmountOp>(filters.amount?.op ?? "equal_to");
  const [amountValue, setAmountValue] = useState(filters.amount?.value ?? "");

  function toggle(set: Set<string>, setSet: (next: Set<string>) => void, value: string) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSet(next);
  }

  // Apply/Clear are both meaningless with nothing set — Apply would just
  // push a bare `/search` (a no-op, see hasAnyFilter's guard in page.tsx)
  // and Clear would have nothing to clear. Disabled (dimmed via the
  // Button component's own disabled styling) instead of hidden, so their
  // layout position stays stable.
  const hasAnyValue =
    accountValues.size > 0 ||
    categoryValues.size > 0 ||
    classValues.size > 0 ||
    gorduraValues.size > 0 ||
    descriptionValue.trim() !== "" ||
    dateValue !== "" ||
    amountValue.trim() !== "";

  function handleApply() {
    const params = new URLSearchParams();

    for (const value of accountValues) params.append("account", value);
    for (const value of categoryValues) params.append("category", value);
    for (const value of classValues) params.append("class", value);
    for (const value of gorduraValues) params.append("gordura", value);
    if (descriptionValue.trim()) {
      params.set("description", descriptionValue.trim());
      params.set("descriptionOp", descriptionOp);
    }
    if (dateValue) {
      params.set("dateGranularity", dateGranularity);
      params.set("dateOp", dateOp);
      params.set("dateValue", dateValue);
    }
    if (amountValue.trim() !== "") {
      params.set("amount", amountValue.trim());
      params.set("amountOp", amountOp);
    }

    const sort = searchParams.get("sort");
    const dir = searchParams.get("dir");
    if (sort) params.set("sort", sort);
    if (dir) params.set("dir", dir);

    router.push(`/search?${params.toString()}`);
  }

  function handleClear() {
    setAccountValues(new Set());
    setCategoryValues(new Set());
    setClassValues(new Set());
    setGorduraValues(new Set());
    setDescriptionValue("");
    setDescriptionOp("contains");
    setDateGranularity("day");
    setDateOp("on");
    setDateValue("");
    setAmountOp("equal_to");
    setAmountValue("");
    router.push("/search");
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <CheckboxSelect
          label="Account"
          placeholder="Any"
          className="w-full"
          selected={accountValues}
          onToggle={(value) => toggle(accountValues, setAccountValues, value)}
          options={accounts.map((account) => ({ value: account.id, label: account.label ?? account.name }))}
        />
        <CheckboxSelect
          label="Category"
          placeholder="Any"
          className="w-full"
          selected={categoryValues}
          onToggle={(value) => toggle(categoryValues, setCategoryValues, value)}
          options={[
            { value: UNCATEGORIZED_VALUE, label: "Uncategorized" },
            ...categories.map((category) => ({ value: category.id, label: category.name })),
          ]}
        />
        <CheckboxSelect
          label="Class"
          placeholder="Any"
          className="w-full"
          selected={classValues}
          onToggle={(value) => toggle(classValues, setClassValues, value)}
          options={[
            { value: UNCLASSED_VALUE, label: "Unclassed" },
            ...classes.map((classItem) => ({ value: classItem.id, label: classItem.name })),
          ]}
        />
        <CheckboxSelect
          label="Gordura"
          placeholder="Any"
          className="w-full"
          selected={gorduraValues}
          onToggle={(value) => toggle(gorduraValues, setGorduraValues, value)}
          options={GORDURA_VALUES.map((value) => ({ value, label: GORDURA_VALUE_LABELS[value] }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        <OperatorField>
          <Select value={descriptionOp} onValueChange={(value) => setDescriptionOp(value as DescriptionOp)}>
            <SelectTrigger className={OPERATOR_TRIGGER_CLASS}>
              <InlineLabel>Description</InlineLabel>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equal_to">{DESCRIPTION_OP_LABELS.equal_to}</SelectItem>
              <SelectItem value="starts_with">{DESCRIPTION_OP_LABELS.starts_with}</SelectItem>
              <SelectItem value="contains">{DESCRIPTION_OP_LABELS.contains}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            aria-label="Description"
            value={descriptionValue}
            onChange={(e) => setDescriptionValue(e.target.value)}
            placeholder="e.g. uber"
            className={OPERATOR_INPUT_CLASS}
          />
        </OperatorField>

        <div className="flex flex-wrap gap-2">
          <Select
            value={dateGranularity}
            onValueChange={(value) => {
              setDateGranularity(value as DateGranularity);
              setDateValue("");
            }}
          >
            <SelectTrigger>
              <InlineLabel>Date</InlineLabel>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="year">{DATE_GRANULARITY_LABELS.year}</SelectItem>
              <SelectItem value="month">{DATE_GRANULARITY_LABELS.month}</SelectItem>
              <SelectItem value="day">{DATE_GRANULARITY_LABELS.day}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateOp} onValueChange={(value) => setDateOp(value as DateOp)}>
            <SelectTrigger aria-label="Date comparison">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="on">{DATE_OP_LABELS.on}</SelectItem>
              <SelectItem value="before">{DATE_OP_LABELS.before}</SelectItem>
              <SelectItem value="after">{DATE_OP_LABELS.after}</SelectItem>
            </SelectContent>
          </Select>
          {dateGranularity === "year" ? (
            <Input
              aria-label="Date"
              type="number"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              placeholder="2026"
              className="min-w-24 flex-1"
            />
          ) : dateGranularity === "month" ? (
            <Input
              aria-label="Date"
              type="month"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="min-w-36 flex-1"
            />
          ) : (
            <Input
              aria-label="Date"
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="min-w-36 flex-1"
            />
          )}
        </div>

        <OperatorField>
          <Select value={amountOp} onValueChange={(value) => setAmountOp(value as AmountOp)}>
            <SelectTrigger className={OPERATOR_TRIGGER_CLASS}>
              <InlineLabel>Amount</InlineLabel>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equal_to">{AMOUNT_OP_LABELS.equal_to}</SelectItem>
              <SelectItem value="greater_than">{AMOUNT_OP_LABELS.greater_than}</SelectItem>
              <SelectItem value="less_than">{AMOUNT_OP_LABELS.less_than}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            aria-label="Amount"
            type="number"
            step="0.01"
            value={amountValue}
            onChange={(e) => setAmountValue(e.target.value)}
            placeholder="-50.00"
            className={OPERATOR_INPUT_CLASS}
          />
        </OperatorField>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleApply} disabled={!hasAnyValue}>
          Apply
        </Button>
        <Button variant="outline" onClick={handleClear} disabled={!hasAnyValue}>
          Clear
        </Button>
      </div>
    </div>
  );
}
