"use client";

import { Fragment, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";
import type { MonthlyRow, MonthlySelection } from "./dashboard-monthly-breakdown";

const MONTH_LABELS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

// Plain-decimal, no R$ — this page reserves the currency symbol for the 6
// stat cards (see dashboard-conventions).
function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

// Mirrors the stat cards' own colors (amount-color-conventions): Income is
// unconditionally emerald, Expenses unconditionally destructive (the
// Dashboard's documented exception to "only positive gets color"),
// Transfers/Uncategorized stay plain. A Category/Class row inherits its
// parent Type row's color rather than getting its own rule.
const TYPE_COLOR: Record<string, string | undefined> = {
  "type:income": "text-emerald-600",
  "type:expense": "text-destructive",
};

// Type-level row backgrounds (income/expense/transfer only — Uncategorized
// stays plain), per explicit user request to make the Type rows stand out.
// The Total column shares this same background rather than a darker
// variant of its own — per explicit user request, it matches the month
// columns exactly.
const TYPE_ROW_BG: Record<string, string | undefined> = {
  "type:income": "bg-emerald-50",
  "type:expense": "bg-red-50",
  "type:transfer": "bg-gray-100",
};

const SELECTED_CELL = "ring-2 ring-inset ring-primary";

// True only when `selected` pins down this exact row (its type/category/
// class), regardless of which month (or the whole year) is selected within
// it — used to tell a row-level click (whole year for that row) apart from
// a single month cell within it.
function rowMatchesSelection(row: MonthlyRow, selected: MonthlySelection | undefined) {
  if (!selected || selected.kind === undefined) return false;
  if (selected.kind !== row.kind) return false;
  if ((selected.categoryId ?? undefined) !== (row.categoryId ?? undefined)) return false;
  if ((selected.classId ?? undefined) !== (row.classId ?? undefined)) return false;
  return true;
}

function TreeRows({
  rows,
  depth,
  colorClassName,
  expanded,
  onToggle,
  selected,
  onSelect,
}: {
  rows: MonthlyRow[];
  depth: number;
  colorClassName?: string;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  selected: MonthlySelection | undefined;
  onSelect: (selection: MonthlySelection) => void;
}) {
  return (
    <>
      {rows.map((row) => {
        const hasChildren = !!row.children && row.children.length > 0;
        const isExpanded = expanded.has(row.key);
        const rowColor = depth === 0 ? TYPE_COLOR[row.key] : colorClassName;
        const rowBg = depth === 0 ? TYPE_ROW_BG[row.key] : undefined;
        const isClassLevel = depth === 2;
        const isCategoryLevel = depth === 1;

        const rowSelected = rowMatchesSelection(row, selected);
        const wholeRowSelected = rowSelected && selected?.month === undefined;
        const rowSelection: MonthlySelection = {
          kind: row.kind,
          categoryId: row.categoryId,
          classId: row.classId,
        };

        return (
          <Fragment key={row.key}>
            <tr
              className={cn(
                isClassLevel ? "border-0" : "border-b last:border-0",
                isCategoryLevel && "border-t",
              )}
            >
              <td
                onClick={() => onSelect(rowSelection)}
                className={cn(
                  "max-w-56 cursor-pointer overflow-hidden px-2 py-2 hover:brightness-95",
                  rowBg ?? "bg-background",
                  wholeRowSelected && SELECTED_CELL,
                )}
              >
                <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 1.25}rem` }}>
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggle(row.key);
                      }}
                      aria-label={isExpanded ? `Collapse ${row.label}` : `Expand ${row.label}`}
                      className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {isExpanded ? <ChevronDownIcon className="size-3" /> : <ChevronRightIcon className="size-3" />}
                    </button>
                  ) : (
                    <span className="inline-block size-4 shrink-0" />
                  )}
                  {row.icon && (
                    <CategoryIcon icon={row.icon} className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  {row.symbol && (
                    <span className="inline-flex w-3.5 shrink-0 justify-center text-muted-foreground" aria-hidden="true">
                      {row.symbol}
                    </span>
                  )}
                  <span className={cn("min-w-0 truncate", depth === 0 && "font-medium")} title={row.label}>
                    {row.label}
                  </span>
                </div>
              </td>
              {row.months.map((value, i) => {
                // A row-scoped cell click (this row, this month) or a
                // column-wide one (any row, this month, no kind at all —
                // from the header/footer) both light this cell up.
                const cellSelected =
                  selected?.month === i && (rowSelected || selected?.kind === undefined);
                return (
                  <td
                    key={i}
                    onClick={() => onSelect({ ...rowSelection, month: i })}
                    className={cn(
                      "cursor-pointer whitespace-nowrap px-0.5 py-2 text-right hover:brightness-95",
                      isClassLevel ? "text-[11px]" : "text-xs",
                      rowColor,
                      rowBg,
                      rowBg && "font-bold",
                      isCategoryLevel && "font-semibold",
                      cellSelected && SELECTED_CELL,
                    )}
                  >
                    {value === 0 ? "" : formatCurrency(value)}
                  </td>
                );
              })}
              <td
                onClick={() => onSelect(rowSelection)}
                className={cn(
                  "cursor-pointer whitespace-nowrap px-2 py-2 text-right hover:brightness-95",
                  isClassLevel ? "text-[11px]" : "text-xs",
                  rowColor,
                  rowBg,
                  rowBg ? "font-bold" : isCategoryLevel ? "font-semibold" : "font-medium",
                  wholeRowSelected && SELECTED_CELL,
                )}
              >
                {row.total === 0 ? "" : formatCurrency(row.total)}
              </td>
            </tr>
            {hasChildren && isExpanded && (
              <TreeRows
                rows={row.children!}
                depth={depth + 1}
                colorClassName={rowColor}
                expanded={expanded}
                onToggle={onToggle}
                selected={selected}
                onSelect={onSelect}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}

export function MonthlyBreakdownTable({
  rows,
  selected,
  onSelect,
}: {
  rows: MonthlyRow[];
  selected: MonthlySelection | undefined;
  onSelect: (selection: MonthlySelection) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Column sums across the top-level Type rows only — Category/Class rows
  // are already folded into their parent Type's months/total, so summing
  // those too would double-count.
  const monthTotals = Array(12).fill(0);
  for (const row of rows) {
    for (let i = 0; i < 12; i++) monthTotals[i] += row.months[i];
  }
  const grandTotal = monthTotals.reduce((sum, value) => sum + value, 0);

  // A month-header/footer click means "this month, any type" — no kind at
  // all, so it's distinct from a row-scoped cell click even when both
  // happen to point at the same month index.
  const columnSelectedMonth = selected?.kind === undefined ? selected?.month : undefined;
  const totalSelected = !!selected && selected.kind === undefined && selected.month === undefined;

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="px-2 py-2" />
            {MONTH_LABELS.map((label, i) => (
              <th
                key={label}
                onClick={() => onSelect({ month: i })}
                className={cn(
                  "cursor-pointer px-0.5 py-2 text-center text-xs font-medium capitalize hover:brightness-95",
                  columnSelectedMonth === i && SELECTED_CELL,
                )}
              >
                {label}
              </th>
            ))}
            <th
              onClick={() => onSelect({})}
              className={cn(
                "cursor-pointer px-2 py-2 text-right text-xs font-medium hover:brightness-95",
                totalSelected && SELECTED_CELL,
              )}
            >
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          <TreeRows rows={rows} depth={0} expanded={expanded} onToggle={toggle} selected={selected} onSelect={onSelect} />
        </tbody>
        <tfoot>
          <tr className="border-t">
            <td className="px-2 py-2 text-xs font-medium">Total</td>
            {monthTotals.map((value, i) => (
              <td
                key={i}
                onClick={() => onSelect({ month: i })}
                className={cn(
                  "cursor-pointer whitespace-nowrap px-0.5 py-2 text-right text-xs font-medium hover:brightness-95",
                  columnSelectedMonth === i && SELECTED_CELL,
                )}
              >
                {value === 0 ? "" : formatCurrency(value)}
              </td>
            ))}
            <td
              onClick={() => onSelect({})}
              className={cn(
                "cursor-pointer whitespace-nowrap px-2 py-2 text-right text-xs font-medium hover:brightness-95",
                totalSelected && SELECTED_CELL,
              )}
            >
              {grandTotal === 0 ? "" : formatCurrency(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
