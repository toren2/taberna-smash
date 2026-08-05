"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EloPoint } from "@/lib/elo";

const COLORS = [
  "#34d399", // emerald
  "#60a5fa", // blue
  "#f472b6", // pink
  "#fbbf24", // amber
  "#a78bfa", // violet
  "#f87171", // red
  "#22d3ee", // cyan
  "#a3e635", // lime
];

export function EloChart({ data, series }: { data: EloPoint[]; series: string[] }) {
  if (data.length <= 1) {
    return (
      <div className="text-sm text-zinc-500 py-6 text-center">
        Aún no hay suficientes sets para graficar la evolución de Elo.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="index" stroke="var(--chart-axis)" fontSize={11} tickLine={false} />
          <YAxis stroke="var(--chart-axis)" fontSize={11} tickLine={false} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((tag, i) => (
            <Line
              key={tag}
              type="monotone"
              dataKey={tag}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
