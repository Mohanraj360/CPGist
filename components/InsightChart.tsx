"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// chartData shape varies by which tool ran last (ranking, promo lift,
// channel mix, whitespace, forecast). Rather than a switch per tool, detect
// the first array field with numeric values and chart that generically.
function findChartableArray(data: any): { rows: any[]; xKey: string; yKey: string } | null {
  if (!data || typeof data !== "object") return null;

  const arrayFields = ["ranking", "channel_mix", "whitespace", "lift_by_promo_type", "detail_rows"];
  for (const field of arrayFields) {
    const rows = data[field];
    if (Array.isArray(rows) && rows.length > 0) {
      const sample = rows[0];
      const keys = Object.keys(sample);
      const yKey = keys.find((k) => typeof sample[k] === "number");
      const xKey = keys.find((k) => typeof sample[k] === "string");
      if (yKey && xKey) return { rows, xKey, yKey };
    }
  }
  return null;
}

export default function InsightChart({ chartData }: { chartData: unknown }) {
  const chartable = findChartableArray(chartData);
  if (!chartable) return null;

  const { rows, xKey, yKey } = chartable;

  return (
    <div className="mt-3 h-64 bg-black/20 rounded-lg p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3a" />
          <XAxis dataKey={xKey} tick={{ fill: "#8890a4", fontSize: 11 }} angle={-15} textAnchor="end" height={50} />
          <YAxis tick={{ fill: "#8890a4", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#161922", border: "1px solid #2a2e3a" }} />
          <Bar dataKey={yKey} fill="#4f7cff" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
