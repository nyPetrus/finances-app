"use client";

import { Fragment, useState } from "react";
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

// True only when `selected` pins down this exact row (its type/gordura/
// category/class), regardless of which month (or the whole year) is selected within
// it — used to tell a row-level click (whole year for that row) apart from
// a single month cell within it.
function rowMatchesSelection(row: MonthlyRow, selected: MonthlySelection | undefined) {
  if (!selected || selected.kind === undefined) return false;
  if (selected.kind !== row.kind) return false;
  if ((selected.gordura ?? undefined) !== (row.gordura ?? undefined)) return false;
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
        // Depth 0 is always Type; which classification each deeper depth
        // represents depends on the user's configured level order, so style
        // off the row's own `level` field instead of a fixed depth number.
        const isGorduraLevel = row.level === "gordura";
        const isClassLevel = row.level === "class";
        const hasIcon = !!row.icon || !!row.symbol;

        const rowSelected = rowMatchesSelection(row, selected);
        const wholeRowSelected = rowSelected && selected?.month === undefined;
        const rowSelection: MonthlySelection = {
          kind: row.kind,
          gordura: row.gordura,
          categoryId: row.categoryId,
          classId: row.classId,
        };

        return (
          <Fragment key={row.key}>
            <tr
              className={cn(
                isClassLevel ? "border-0" : "border-b last:border-0",
                isGorduraLevel && "border-t",
              )}
            >
              <td
                onClick={hasChildren ? () => onToggle(row.key) : undefined}
                className={cn(
                  "sticky left-0 z-10 max-w-56 overflow-hidden border-r px-2 py-2",
                  hasChildren && "hover:brightness-95",
                  rowBg ?? "bg-background",
                  wholeRowSelected && SELECTED_CELL,
                )}
              >
                <div
                  className="flex items-center gap-1.5"
                  style={{ paddingLeft: `${depth}rem` }}
                  title={hasIcon ? row.label : undefined}
                >
                  {row.icon && (
                    <CategoryIcon icon={row.icon} className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  {row.symbol && (
                    <span
                      className="inline-flex w-4 shrink-0 justify-center text-base font-bold text-muted-foreground"
                      aria-hidden="true"
                    >
                      {row.symbol}
                    </span>
                  )}
                  {/* Type/Category rows show only their icon/symbol, not the
                      name (per explicit user request) — but a row with
                      neither (e.g. Uncategorized, or a Gordura row) still
                      needs its label so it isn't left blank. Class rows
                      never have an icon, so they always keep their label. */}
                  {(!hasIcon || isClassLevel) && (
                    <span className={cn("min-w-0 truncate", depth === 0 && "font-medium")} title={row.label}>
                      {row.label}
                    </span>
                  )}
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
                      "whitespace-nowrap px-0.5 py-2 text-right hover:brightness-95",
                      isClassLevel ? "text-[11px]" : "text-xs",
                      rowColor,
                      rowBg,
                      rowBg && "font-bold",
                      isGorduraLevel && "font-semibold",
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
                  "sticky right-0 z-10 whitespace-nowrap border-l px-2 py-2 text-right hover:brightness-95",
                  isClassLevel ? "text-[11px]" : "text-xs",
                  rowColor,
                  rowBg ?? "bg-background",
                  rowBg ? "font-bold" : isGorduraLevel ? "font-semibold" : "font-medium",
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
    <div className="max-h-[70vh] overflow-auto rounded-md border">
      {/* cursor-default: without it the browser shows the text I-beam over
          every number, which reads as an editable cell. select-none: clicks
          filter/expand, so they shouldn't also highlight the text. */}
      <table className="w-full cursor-default select-none border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="sticky top-0 left-0 z-30 border-r bg-background px-2 py-2" />
            {MONTH_LABELS.map((label, i) => (
              <th
                key={label}
                onClick={() => onSelect({ month: i })}
                className={cn(
                  "sticky top-0 z-20 bg-background px-0.5 py-2 text-center text-xs font-medium capitalize hover:brightness-95",
                  columnSelectedMonth === i && SELECTED_CELL,
                )}
              >
                {label}
              </th>
            ))}
            <th
              onClick={() => onSelect({})}
              className={cn(
                "sticky top-0 right-0 z-30 border-l bg-background px-2 py-2 text-right text-xs font-medium hover:brightness-95",
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
            <td className="sticky bottom-0 left-0 z-30 border-r bg-background px-2 py-2 text-xs font-medium">
              Total
            </td>
            {monthTotals.map((value, i) => (
              <td
                key={i}
                onClick={() => onSelect({ month: i })}
                className={cn(
                  "sticky bottom-0 z-20 whitespace-nowrap bg-background px-0.5 py-2 text-right text-xs font-medium hover:brightness-95",
                  columnSelectedMonth === i && SELECTED_CELL,
                )}
              >
                {value === 0 ? "" : formatCurrency(value)}
              </td>
            ))}
            <td
              onClick={() => onSelect({})}
              className={cn(
                "sticky right-0 bottom-0 z-30 whitespace-nowrap border-l bg-background px-2 py-2 text-right text-xs font-medium hover:brightness-95",
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
