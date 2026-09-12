"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { name: string; amount: number; color: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const { name, amount, color } = payload[0].payload;

  return (
    <div className="flex items-center gap-2 rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span>{name}</span>
      <span className="ml-auto font-medium">{formatCurrency(amount)}</span>
    </div>
  );
}

export function CategoryBarChart({
  data,
  selectedKey,
  onSelect,
}: {
  data: { key: string; name: string; amount: number; color: string }[];
  selectedKey?: string;
  onSelect?: (key: string) => void;
}) {
  const height = Math.max(120, data.length * 36);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={110}
          tick={{ fill: "#52514e", fontSize: 12 }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#89878114" }} />
        <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((entry) => (
            <Cell
              key={entry.key}
              fill={entry.color}
              opacity={!selectedKey || entry.key === selectedKey ? 1 : 0.35}
              onClick={() => onSelect?.(entry.key)}
              style={{ cursor: onSelect ? "pointer" : undefined }}
            />
          ))}
          <LabelList
            dataKey="amount"
            position="right"
            formatter={(value: string | number | boolean | null | undefined) =>
              formatCurrency(Number(value ?? 0))
            }
            style={{ fill: "#0b0b0b", fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
