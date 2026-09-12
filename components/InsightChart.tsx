"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function findChartableArray(data: any): { rows: any[]; xKey: string; yKey: string } | null {
  if (!data || typeof data !== "object") return null;
  for (const field of ["ranking", "channel_mix", "whitespace", "lift_by_promo_type", "detail_rows"]) {
    const rows = data[field];
    if (Array.isArray(rows) && rows.length) { const sample = rows[0]; const keys = Object.keys(sample); const yKey = keys.find((k) => typeof sample[k] === "number"); const xKey = keys.find((k) => typeof sample[k] === "string"); if (yKey && xKey) return { rows, xKey, yKey }; }
  }
  return null;
}

export default function InsightChart({ chartData }: { chartData: unknown }) {
  const chartable = findChartableArray(chartData);
  if (!chartable) return null;
  return <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold text-[var(--ink)]">Data view</p><p className="text-[10px] text-[var(--muted)]">Returned values</p></div><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartable.rows} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8e3" vertical={false} /><XAxis dataKey={chartable.xKey} tick={{ fill: "#71817b", fontSize: 11 }} angle={-15} textAnchor="end" height={50} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#71817b", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#18332e", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 }} cursor={{ fill: "#e3f2e9" }} /><Bar dataKey={chartable.yKey} fill="#287b55" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>;
}
