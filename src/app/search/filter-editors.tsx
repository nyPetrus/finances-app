"use client";

import { useState, type ReactNode } from "react";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, type LucideIcon } from "lucide-react";
import { AccountTypeIcon } from "@/components/account-type-icon";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { parseBRNumber } from "@/lib/locale-format";
import type { Account } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { MONTH_LABELS, type DateGranularity, type DateOp } from "./filters";

// The step-two panels of SearchFilterBar: once a field is picked (or its
// chip clicked), one of these edits that field's value. Each calls onApply
// with the finished value — or null, meaning "remove this filter".

// The bar's chip shows a value's symbol instead of its name when it has one
// (see the symbol-display rule in table-page-conventions): `icon` is a
// category icon key, `symbol` an icon component (autonomy's padlocks).
// `label` is the name; pickers show it after the symbol. `accountType` is an
// account's type, whose icon trails the name (name first, icon last — the
// same name + icon an account renders as everywhere else).
export type Option = {
  value: string;
  label: string;
  symbol?: LucideIcon;
  icon?: string | null;
  accountType?: Account["type"];
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function EditorHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-1 border-b pb-1">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to filter list"
        title="Back to filter list"
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground pointer-coarse:p-2"
      >
        <ChevronLeftIcon className="size-4" />
      </button>
      <span className="font-medium">{title}</span>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-md bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 rounded px-2 py-1 text-xs transition-colors pointer-coarse:py-2 pointer-coarse:text-sm",
            value === option.value
              ? "bg-background font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function EditorFooter({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-2 border-t pt-2">{children}</div>;
}

// ── Account / Category / Class / Autonomy ─────────────────────────────────

export function CheckboxEditor({
  title,
  options,
  initial,
  onApply,
  onBack,
}: {
  title: string;
  options: Option[];
  initial: string[];
  onApply: (values: string[]) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState(() => new Set(initial));
  const [query, setQuery] = useState("");
  const showSearch = options.length > 8;
  // On touch screens, focusing the find box would pop the keyboard over a
  // list that's usually picked by tapping — only autofocus with a mouse.
  const [finePointer] = useState(() => window.matchMedia("(pointer: fine)").matches);
  const visible = query
    ? options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSelected(next);
  }

  // Keep the options' own order rather than click order, so the chip text
  // is stable.
  const apply = () => onApply(options.filter((option) => selected.has(option.value)).map((option) => option.value));

  return (
    <div className="flex flex-col gap-2">
      <EditorHeader title={title} onBack={onBack} />
      {showSearch && (
        <Input
          autoFocus={finePointer}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply();
          }}
          placeholder={`Find ${title.toLowerCase()}…`}
          aria-label={`Find ${title.toLowerCase()}`}
        />
      )}
      <div role="listbox" aria-multiselectable aria-label={title} className="max-h-64 overflow-auto max-sm:max-h-[50dvh]">
        {visible.map((option, index) => {
          const checked = selected.has(option.value);
          return (
            <div
              key={option.value}
              role="option"
              aria-selected={checked}
              tabIndex={0}
              autoFocus={finePointer && !showSearch && index === 0}
              onClick={() => toggle(option.value)}
              onKeyDown={(e) => {
                if (e.key === " ") {
                  e.preventDefault();
                  toggle(option.value);
                } else if (e.key === "Enter") {
                  apply();
                }
              }}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 outline-none hover:bg-muted focus-visible:bg-muted pointer-coarse:py-2.5"
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input",
                  checked && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {checked && <CheckIcon className="size-3" />}
              </span>
              {option.symbol && <option.symbol className="size-3.5 shrink-0" />}
              <span className="min-w-0 truncate">{option.label}</span>
              {option.accountType && <AccountTypeIcon type={option.accountType} className="size-3.5 shrink-0" />}
            </div>
          );
        })}
        {visible.length === 0 && <p className="px-1.5 py-1 text-muted-foreground">No matches</p>}
      </div>
      <EditorFooter>
        {selected.size > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        )}
        <Button size="sm" onClick={apply}>
          Apply
        </Button>
      </EditorFooter>
    </div>
  );
}

// ── Description / Amount ─────────────────────────────────────────────────

export function OperatorEditor<Op extends string>({
  title,
  ops,
  initial,
  numeric,
  placeholder,
  onApply,
  onBack,
}: {
  title: string;
  ops: { value: Op; label: string }[];
  initial: { op: Op; value: string };
  numeric?: boolean;
  placeholder: string;
  onApply: (filter: { op: Op; value: string } | null) => void;
  onBack: () => void;
}) {
  const [op, setOp] = useState<Op>(initial.op);
  // Numeric values live in the URL as "-50.5" but are shown/typed as "-50,5".
  const [value, setValue] = useState(numeric ? initial.value.replace(".", ",") : initial.value);

  const parsed = numeric ? parseBRNumber(value) : null;
  const trimmed = numeric ? (parsed === null ? "" : String(parsed)) : value.trim();
  const invalid = numeric && value.trim() !== "" && parsed === null;
  const apply = () => {
    if (invalid) return;
    onApply(trimmed === "" ? null : { op, value: trimmed });
  };

  return (
    <div className="flex flex-col gap-2">
      <EditorHeader title={title} onBack={onBack} />
      <Segmented label={`${title} comparison`} options={ops} value={op} onChange={setOp} />
      <Input
        autoFocus
        type="text"
        inputMode={numeric ? "decimal" : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") apply();
        }}
        placeholder={placeholder}
        aria-label={title}
        aria-invalid={invalid || undefined}
      />
      <EditorFooter>
        <Button size="sm" onClick={apply} disabled={invalid}>
          Apply
        </Button>
      </EditorFooter>
    </div>
  );
}

// ── Date ─────────────────────────────────────────────────────────────────

type DateFilter = { granularity: DateGranularity; op: DateOp; value: string };

const DATE_OP_OPTIONS: { value: DateOp; label: string }[] = [
  { value: "on", label: "On" },
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
];

const GRANULARITY_OPTIONS: { value: DateGranularity; label: string }[] = [
  { value: "year", label: "Year" },
  { value: "month", label: "Month" },
  { value: "day", label: "Day" },
];

function GridButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-md px-2 py-1.5 text-sm transition-colors pointer-coarse:py-3",
        selected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function PagerHeader({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <button type="button" onClick={onPrev} aria-label="Previous" title="Previous" className="rounded-md p-1 hover:bg-muted pointer-coarse:p-2">
        <ChevronLeftIcon className="size-4" />
      </button>
      <span className="text-sm font-medium">{label}</span>
      <button type="button" onClick={onNext} aria-label="Next" title="Next" className="rounded-md p-1 hover:bg-muted pointer-coarse:p-2">
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );
}

export function DateEditor({
  initial,
  onApply,
  onBack,
}: {
  initial: DateFilter | null;
  onApply: (filter: DateFilter | null) => void;
  onBack: () => void;
}) {
  const today = new Date();
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth() + 1;

  const [op, setOp] = useState<DateOp>(initial?.op ?? "on");
  // Month is the default level — the most common search is "this month".
  const [granularity, setGranularity] = useState<DateGranularity>(initial?.granularity ?? "month");
  const [value, setValue] = useState(initial?.value ?? "");

  const [initialYear] = (initial?.value ?? "").split("-").map(Number);
  const [monthViewYear, setMonthViewYear] = useState(initialYear || thisYear);
  const [yearPageStart, setYearPageStart] = useState((initialYear || thisYear) - 10);

  // Picking a value applies straight away with the current operator; the
  // footer Apply is only needed after changing just the operator.
  const pick = (nextGranularity: DateGranularity, nextValue: string) =>
    onApply({ granularity: nextGranularity, op, value: nextValue });

  const lastMonthDate = new Date(thisYear, thisMonth - 2, 1);
  const shortcuts: { label: string; granularity: DateGranularity; value: string }[] = [
    { label: "This month", granularity: "month", value: `${thisYear}-${pad(thisMonth)}` },
    {
      label: "Last month",
      granularity: "month",
      value: `${lastMonthDate.getFullYear()}-${pad(lastMonthDate.getMonth() + 1)}`,
    },
    { label: "This year", granularity: "year", value: String(thisYear) },
  ];

  const selectedDay = granularity === "day" && value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <div className="flex flex-col gap-2">
      <EditorHeader title="Date" onBack={onBack} />
      <Segmented label="Date comparison" options={DATE_OP_OPTIONS} value={op} onChange={setOp} />

      <div className="flex flex-wrap gap-1">
        {shortcuts.map((shortcut) => (
          <Button
            key={shortcut.label}
            variant="outline"
            size="xs"
            className="pointer-coarse:h-9 pointer-coarse:px-3"
            onClick={() => pick(shortcut.granularity, shortcut.value)}
          >
            {shortcut.label}
          </Button>
        ))}
      </div>

      <Segmented
        label="Date level"
        options={GRANULARITY_OPTIONS}
        value={granularity}
        onChange={(next) => {
          // A value shaped for one level ("2026-09-15") means nothing at
          // another — reset rather than convert.
          setGranularity(next);
          setValue("");
        }}
      />

      {granularity === "year" && (
        <div className="flex flex-col gap-1">
          <PagerHeader
            label={`${yearPageStart} – ${yearPageStart + 11}`}
            onPrev={() => setYearPageStart(yearPageStart - 12)}
            onNext={() => setYearPageStart(yearPageStart + 12)}
          />
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }, (_, i) => yearPageStart + i).map((year) => (
              <GridButton key={year} selected={value === String(year)} onClick={() => pick("year", String(year))}>
                {year}
              </GridButton>
            ))}
          </div>
        </div>
      )}

      {granularity === "month" && (
        <div className="flex flex-col gap-1">
          <PagerHeader
            label={String(monthViewYear)}
            onPrev={() => setMonthViewYear(monthViewYear - 1)}
            onNext={() => setMonthViewYear(monthViewYear + 1)}
          />
          <div className="grid grid-cols-4 gap-1">
            {MONTH_LABELS.map((label, i) => {
              const monthValue = `${monthViewYear}-${pad(i + 1)}`;
              return (
                <GridButton key={label} selected={value === monthValue} onClick={() => pick("month", monthValue)}>
                  {label}
                </GridButton>
              );
            })}
          </div>
        </div>
      )}

      {granularity === "day" && (
        <Calendar
          mode="single"
          className="mx-auto bg-transparent p-0"
          selected={selectedDay}
          defaultMonth={selectedDay ?? today}
          onSelect={(date) => {
            if (!date) return;
            pick("day", `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
          }}
        />
      )}

      {value !== "" && (
        <EditorFooter>
          <Button size="sm" onClick={() => onApply({ granularity, op, value })}>
            Apply
          </Button>
        </EditorFooter>
      )}
    </div>
  );
}
