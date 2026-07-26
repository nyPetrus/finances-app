"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/lib/supabase/types";

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2000, i, 1)),
);

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function MonthlyExecution({
  defaultMonth,
  categories,
  plannedByCategory,
  actualByCategory,
}: {
  defaultMonth: number;
  categories: Category[];
  plannedByCategory: Map<string, number[]>;
  actualByCategory: Map<string, number[]>;
}) {
  const [month, setMonth] = useState(defaultMonth);

  const rows = categories
    .map((category) => {
      const planned = plannedByCategory.get(category.id)?.[month - 1] ?? 0;
      const actual = actualByCategory.get(category.id)?.[month - 1] ?? 0;
      return { category, planned, actual, variance: planned - actual };
    })
    .filter((row) => row.planned !== 0 || row.actual !== 0);

  const totals = rows.reduce(
    (acc, row) => ({ planned: acc.planned + row.planned, actual: acc.actual + row.actual }),
    { planned: 0, actual: 0 },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Month</span>
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-40 capitalize">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_LABELS.map((label, i) => (
              <SelectItem key={label} value={String(i + 1)} className="capitalize">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No planned or actual amounts for this month yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Category</th>
                <th className="px-3 py-2 text-right font-medium">Planned</th>
                <th className="px-3 py-2 text-right font-medium">Actual</th>
                <th className="px-3 py-2 text-right font-medium">Variance</th>
                <th className="px-3 py-2 text-left font-medium">Progress</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ category, planned, actual, variance }) => {
                const pct = planned > 0 ? Math.min(100, (Math.abs(actual) / planned) * 100) : 0;
                const overBudget = planned > 0 && Math.abs(actual) > planned;
                return (
                  <tr key={category.id} className="border-b last:border-0">
                    <td className="flex items-center gap-2 px-3 py-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(planned)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(actual)}</td>
                    <td
                      className={`px-3 py-2 text-right ${variance < 0 ? "text-destructive" : "text-emerald-600"}`}
                    >
                      {formatCurrency(variance)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full ${overBudget ? "bg-destructive" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-medium">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right">{formatCurrency(totals.planned)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(totals.actual)}</td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(totals.planned - totals.actual)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
