"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EXPENSE_FLAT } from "@/lib/chart-colors";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short" }).format(
    value,
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
      <p className="mb-1 font-medium capitalize">{label}</p>
      <p className="flex items-center gap-2 text-muted-foreground">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: EXPENSE_FLAT }} />
        <span>Expenses</span>
        <span className="ml-auto font-medium text-foreground">{formatCurrency(payload[0].value)}</span>
      </p>
    </div>
  );
}

export function ExpensesByMonthChart({
  data,
  selectedMonth,
  onSelect,
}: {
  data: { month: string; expenses: number }[];
  selectedMonth?: number;
  onSelect?: (month: number) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barCategoryGap={12} barGap={2}>
        <CartesianGrid vertical={false} stroke="#e1e0d9" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={{ stroke: "#c3c2b7" }}
          tick={{ fill: "#898781", fontSize: 12 }}
          className="capitalize"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#898781", fontSize: 12 }}
          tickFormatter={formatCompact}
          width={48}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#89878114" }} />
        <Bar dataKey="expenses" name="Expenses" fill={EXPENSE_FLAT} radius={[4, 4, 0, 0]} maxBarSize={18}>
          {data.map((entry, index) => (
            <Cell
              key={entry.month}
              opacity={selectedMonth === undefined || selectedMonth === index ? 1 : 0.35}
              onClick={() => onSelect?.(index)}
              style={{ cursor: onSelect ? "pointer" : undefined }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
