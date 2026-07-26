"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PLANNED_COLOR = "#2a78d6";
const ACTUAL_COLOR = "#eb6834";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
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
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
      <p className="mb-1 font-medium capitalize">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="capitalize">{entry.name}</span>
          <span className="ml-auto font-medium text-foreground">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function BudgetVsActualChart({
  data,
}: {
  data: { month: string; planned: number; actual: number }[];
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
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "#52514e" }}
        />
        <Bar dataKey="planned" name="Planned" fill={PLANNED_COLOR} radius={[4, 4, 0, 0]} maxBarSize={18} />
        <Bar dataKey="actual" name="Actual" fill={ACTUAL_COLOR} radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
