"use client";

import { Fragment } from "react";
import { AutonomyIcon } from "@/components/autonomy-icon";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";
import { TRANSACTION_TYPE_SYMBOL_ROTATION } from "@/lib/transaction-type";
import type { MonthlyRow, MonthlySelection } from "./dashboard-monthly-breakdown";

export const MONTH_LABELS = [
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
// parent Type row's color rather than getting its own rule (rows above the
// Type level have no color). Keyed by the Type row's `kind`.
const TYPE_COLOR: Record<string, string | undefined> = {
  income: "text-emerald-600",
  expense: "text-destructive",
};

// Type-level row backgrounds (income/expense/transfer only — Uncategorized
// stays plain), per explicit user request to make the Type rows stand out.
// The Total column shares this same background rather than a darker
// variant of its own — per explicit user request, it matches the month
// columns exactly.
const TYPE_ROW_BG: Record<string, string | undefined> = {
  income: "bg-emerald-50",
  expense: "bg-red-50",
  transfer: "bg-gray-100",
};

const SELECTED_CELL = "ring-2 ring-inset ring-primary";

// A row-scoped selection sets at least one of these; a header/footer
// (column-wide) one sets none.
function isRowScoped(selected: MonthlySelection | undefined) {
  return !!selected && !!(selected.kind || selected.autonomy || selected.categoryId || selected.classId);
}

// True only when `selected` pins down this exact row (its type/autonomy/
// category/class), regardless of which month (or the whole year) is selected within
// it — used to tell a row-level click (whole year for that row) apart from
// a single month cell within it.
function rowMatchesSelection(row: MonthlyRow, selected: MonthlySelection | undefined) {
  if (!selected || !isRowScoped(selected)) return false;
  if ((selected.kind ?? undefined) !== (row.kind ?? undefined)) return false;
  if ((selected.autonomy ?? undefined) !== (row.autonomy ?? undefined)) return false;
  if ((selected.categoryId ?? undefined) !== (row.categoryId ?? undefined)) return false;
  if ((selected.classId ?? undefined) !== (row.classId ?? undefined)) return false;
  return true;
}

function TreeRows({
  rows,
  depth,
  colorClassName,
  visibleMonths,
  expanded,
  onToggle,
  selected,
  onSelect,
}: {
  rows: MonthlyRow[];
  depth: number;
  visibleMonths: number[];
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
        // Which level each depth represents depends on the user's configured
        // level order, so style off the row's own `level` field instead of a
        // fixed depth number.
        const isTypeLevel = row.level === "type";
        const rowColor = isTypeLevel && row.kind ? TYPE_COLOR[row.kind] : colorClassName;
        const rowBg = isTypeLevel && row.kind ? TYPE_ROW_BG[row.kind] : undefined;
        const isAutonomyLevel = row.level === "autonomy";
        const isClassLevel = row.level === "class";
        // Autonomy rows show their padlock (AutonomyIcon, from row.autonomy).
        const hasIcon = !!row.icon || !!row.symbol || (isAutonomyLevel && !!row.autonomy);

        const rowSelected = rowMatchesSelection(row, selected);
        const wholeRowSelected = rowSelected && selected?.month === undefined;
        const rowSelection: MonthlySelection = {
          kind: row.kind,
          autonomy: row.autonomy,
          categoryId: row.categoryId,
          classId: row.classId,
        };

        return (
          <Fragment key={row.key}>
            <tr
              className={cn(
                isClassLevel ? "border-0" : "border-b last:border-0",
                isAutonomyLevel && "border-t",
              )}
            >
              <td
                onClick={hasChildren ? () => onToggle(row.key) : undefined}
                className={cn(
                  "sticky left-0 z-10 max-w-56 overflow-hidden border-r py-2 pr-0.5 pl-2 max-sm:max-w-36 pointer-coarse:py-3",
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
                  {isAutonomyLevel && row.autonomy && (
                    <AutonomyIcon autonomy={row.autonomy} className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  {row.symbol && (
                    <span
                      className={cn(
                        "inline-flex w-4 shrink-0 justify-center text-base text-muted-foreground",
                        isTypeLevel && row.kind && row.kind !== "uncategorized" && TRANSACTION_TYPE_SYMBOL_ROTATION[row.kind],
                      )}
                      aria-hidden="true"
                    >
                      {row.symbol}
                    </span>
                  )}
                  {/* Type/Category rows show only their icon/symbol, not the
                      name (per explicit user request) — but a row with
                      neither (e.g. Uncategorized, or a Autonomy row) still
                      needs its label so it isn't left blank. Class rows
                      follow the same rule now that classes have icons. */}
                  {!hasIcon && (
                    <span className={cn("min-w-0 truncate", depth === 0 && "font-medium")} title={row.label}>
                      {row.label}
                    </span>
                  )}
                </div>
              </td>
              {visibleMonths.map((i) => {
                const value = row.months[i];
                // A row-scoped cell click (this row, this month) or a
                // column-wide one (any row, this month, no kind at all —
                // from the header/footer) both light this cell up.
                const cellSelected =
                  selected?.month === i && (rowSelected || !isRowScoped(selected));
                return (
                  <td
                    key={i}
                    onClick={() => onSelect({ ...rowSelection, month: i })}
                    className={cn(
                      "whitespace-nowrap px-0.5 py-2 text-right hover:brightness-95 max-sm:px-2 pointer-coarse:py-3",
                      isClassLevel ? "text-[11px]" : "text-xs",
                      rowColor,
                      rowBg,
                      rowBg && "font-bold",
                      isAutonomyLevel && "font-semibold",
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
                  "sticky right-0 z-10 whitespace-nowrap border-l px-2 py-2 text-right hover:brightness-95 pointer-coarse:py-3",
                  isClassLevel ? "text-[11px]" : "text-xs",
                  rowColor,
                  rowBg ?? "bg-background",
                  rowBg ? "font-bold" : isAutonomyLevel ? "font-semibold" : "font-medium",
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
                visibleMonths={visibleMonths}
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

// Expand state is owned by dashboard-explorer.tsx, so its toolbar's
// expand/collapse-all button can drive it too.
export function MonthlyBreakdownTable({
  year,
  rows,
  monthTotals,
  visibleMonths,
  selected,
  onSelect,
  expanded,
  onToggle,
}: {
  // Labels the trailing year-total column (e.g. "2026").
  year: number;
  rows: MonthlyRow[];
  // Computed from all the year's transactions (buildMonthTotals), not from
  // `rows` — a Category/Class top level drops transactions without one.
  monthTotals: number[];
  // Month indexes (0-11) to render as columns, from the Months menu. The
  // Year column always sums all 12 months regardless.
  visibleMonths: number[];
  selected: MonthlySelection | undefined;
  onSelect: (selection: MonthlySelection) => void;
  expanded: Set<string>;
  onToggle: (key: string) => void;
}) {
  const grandTotal = monthTotals.reduce((sum, value) => sum + value, 0);

  // A month-header/footer click means "this month, any type" — no kind at
  // all, so it's distinct from a row-scoped cell click even when both
  // happen to point at the same month index.
  const columnSelectedMonth = !isRowScoped(selected) ? selected?.month : undefined;
  const totalSelected = !!selected && !isRowScoped(selected) && selected.month === undefined;

  return (
    // Phones: nearly full-height, so scrolling the table and scrolling the
    // page fight less.
    <div className="max-h-[70vh] overflow-auto rounded-md border max-sm:max-h-[calc(100dvh-9rem-env(safe-area-inset-bottom))]">
      {/* cursor-default: without it the browser shows the text I-beam over
          every number, which reads as an editable cell. select-none: clicks
          filter/expand, so they shouldn't also highlight the text. */}
      <table className="w-full cursor-default select-none border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="sticky top-0 left-0 z-30 border-r bg-background py-2 pr-0.5 pl-2" />
            {visibleMonths.map((i) => (
              <th
                key={i}
                onClick={() => onSelect({ month: i })}
                className={cn(
                  "sticky top-0 z-20 bg-background px-0.5 py-2 text-center text-xs font-medium capitalize hover:brightness-95",
                  columnSelectedMonth === i && SELECTED_CELL,
                )}
              >
                {MONTH_LABELS[i]}
              </th>
            ))}
            <th
              onClick={() => onSelect({})}
              className={cn(
                "sticky top-0 right-0 z-30 border-l bg-background px-2 py-2 text-right text-xs font-medium hover:brightness-95",
                totalSelected && SELECTED_CELL,
              )}
            >
              {year}
            </th>
          </tr>
        </thead>
        <tbody>
          <TreeRows rows={rows} depth={0} visibleMonths={visibleMonths} expanded={expanded} onToggle={onToggle} selected={selected} onSelect={onSelect} />
        </tbody>
        <tfoot>
          <tr className="border-t">
            <td className="sticky bottom-0 left-0 z-30 border-r bg-background py-2 pr-0.5 pl-2 text-xs font-medium">
              Total
            </td>
            {visibleMonths.map((i) => (
              <td
                key={i}
                onClick={() => onSelect({ month: i })}
                className={cn(
                  "sticky bottom-0 z-20 whitespace-nowrap bg-background px-0.5 py-2 text-right text-xs font-medium hover:brightness-95",
                  columnSelectedMonth === i && SELECTED_CELL,
                )}
              >
                {monthTotals[i] === 0 ? "" : formatCurrency(monthTotals[i])}
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
