"use client";

import { Fragment, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";
import type { MonthlyRow } from "./dashboard-monthly-breakdown";

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
// stays plain) and their darker Total-column variant, per explicit user
// request to make the Type rows and the Total column stand out.
const TYPE_ROW_BG: Record<string, string | undefined> = {
  "type:income": "bg-emerald-50",
  "type:expense": "bg-red-50",
  "type:transfer": "bg-gray-100",
};

const TYPE_ROW_BG_TOTAL: Record<string, string | undefined> = {
  "type:income": "bg-emerald-100",
  "type:expense": "bg-red-100",
  "type:transfer": "bg-gray-200",
};

// Fallback Total-column background for every row that isn't a colored Type
// row (Category/Class/Uncategorized) — a little darker than the plain
// surrounding cells, so the Total column stands out on its own.
const DEFAULT_TOTAL_BG = "bg-muted/40";

function TreeRows({
  rows,
  depth,
  colorClassName,
  expanded,
  onToggle,
}: {
  rows: MonthlyRow[];
  depth: number;
  colorClassName?: string;
  expanded: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <>
      {rows.map((row) => {
        const hasChildren = !!row.children && row.children.length > 0;
        const isExpanded = expanded.has(row.key);
        const rowColor = depth === 0 ? TYPE_COLOR[row.key] : colorClassName;
        const rowBg = depth === 0 ? TYPE_ROW_BG[row.key] : undefined;
        const totalBg = (depth === 0 && TYPE_ROW_BG_TOTAL[row.key]) || DEFAULT_TOTAL_BG;
        const isClassLevel = depth === 2;
        const isCategoryLevel = depth === 1;

        return (
          <Fragment key={row.key}>
            <tr
              className={cn(
                isClassLevel ? "border-0" : "border-b last:border-0",
                isCategoryLevel && "border-t",
              )}
            >
              <td className={cn("max-w-56 overflow-hidden px-2 py-2", rowBg ?? "bg-background")}>
                <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 1.25}rem` }}>
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => onToggle(row.key)}
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
              {row.months.map((value, i) => (
                <td
                  key={i}
                  className={cn(
                    "whitespace-nowrap px-0.5 py-2 text-right",
                    isClassLevel ? "text-[11px]" : "text-xs",
                    rowColor,
                    rowBg,
                    rowBg && "font-bold",
                    isCategoryLevel && "font-semibold",
                  )}
                >
                  {value === 0 ? "" : formatCurrency(value)}
                </td>
              ))}
              <td
                className={cn(
                  "whitespace-nowrap px-2 py-2 text-right",
                  isClassLevel ? "text-[11px]" : "text-xs",
                  rowColor,
                  totalBg,
                  rowBg ? "font-bold" : isCategoryLevel ? "font-semibold" : "font-medium",
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
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}

export function MonthlyBreakdownTable({ rows }: { rows: MonthlyRow[] }) {
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

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/70">
            <th className="bg-muted/70 px-2 py-2" />
            {MONTH_LABELS.map((label) => (
              <th key={label} className="px-0.5 py-2 text-center text-xs font-medium capitalize">
                {label}
              </th>
            ))}
            <th className="bg-muted px-2 py-2 text-right text-xs font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          <TreeRows rows={rows} depth={0} expanded={expanded} onToggle={toggle} />
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/70">
            <td className="px-2 py-2 text-xs font-medium">Total</td>
            {monthTotals.map((value, i) => (
              <td key={i} className="whitespace-nowrap px-0.5 py-2 text-right text-xs font-medium">
                {value === 0 ? "" : formatCurrency(value)}
              </td>
            ))}
            <td className="whitespace-nowrap bg-muted px-2 py-2 text-right text-xs font-medium">
              {grandTotal === 0 ? "" : formatCurrency(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
