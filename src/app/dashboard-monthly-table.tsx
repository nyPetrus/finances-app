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
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
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

        return (
          <Fragment key={row.key}>
            <tr className="border-b last:border-0">
              <td className="max-w-56 overflow-hidden bg-background px-2 py-2">
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
                  <span className={cn("min-w-0 truncate", depth === 0 && "font-medium")} title={row.label}>
                    {row.label}
                  </span>
                </div>
              </td>
              {row.months.map((value, i) => (
                <td key={i} className={cn("whitespace-nowrap px-0.5 py-2 text-right text-xs", rowColor)}>
                  {formatCurrency(value)}
                </td>
              ))}
              <td className={cn("whitespace-nowrap px-2 py-2 text-right text-xs font-medium", rowColor)}>
                {formatCurrency(row.total)}
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

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="bg-muted/50 px-2 py-2" />
            {MONTH_LABELS.map((label) => (
              <th key={label} className="px-0.5 py-2 text-center text-xs font-medium capitalize">
                {label}
              </th>
            ))}
            <th className="px-2 py-2 text-right text-xs font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          <TreeRows rows={rows} depth={0} expanded={expanded} onToggle={toggle} />
        </tbody>
      </table>
    </div>
  );
}
