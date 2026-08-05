"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EloPoint } from "@/lib/elo";

export function MiniEloChart({ data, dataKey }: { data: EloPoint[]; dataKey: string }) {
  if (data.length <= 1) {
    return <div className="text-xs text-[var(--muted)] py-4 text-center">Sin suficientes sets para graficar.</div>;
  }

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="index" stroke="var(--chart-axis)" fontSize={10} tickLine={false} />
          <YAxis stroke="var(--chart-axis)" fontSize={10} tickLine={false} domain={["auto", "auto"]} width={30} />
          <Tooltip
            contentStyle={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: 8,
              fontSize: 11,
            }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
          />
          <Line type="monotone" dataKey={dataKey} stroke="#34d399" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
