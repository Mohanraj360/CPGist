"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface ForecastResult {
  projected_lift_pct?: number;
  estimated_incremental_dollars?: number;
  caveat?: string | null;
  found?: boolean;
  note?: string;
}

export default function WhatIfSimulator() {
  // Phase 5 bug fix: these were "Fizzly" / "Blinkit" — leftover from the
  // original 5-brand demo dataset, not present since Phase 1's 110-brand
  // rebuild (same stale-name bug class Phase 3 fixed in Sidebar.tsx /
  // ChatUI.tsx, but this file wasn't touched in that pass). Swapped for a
  // brand+retailer pairing confirmed to have real sales_facts rows.
  const [brand, setBrand] = useState("True Water Co");
  const [retailer, setRetailer] = useState("QuickDash (Metro)");
  const [promoDepth, setPromoDepth] = useState(20);
  const [promoDuration, setPromoDuration] = useState(4);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Curve of projected lift across a depth range, for the "before you commit"
  // preview chart — reuses the same /api/forecast endpoint per point.
  const [curve, setCurve] = useState<{ depth: number; lift: number }[]>([]);

  async function runForecast() {
    setLoading(true);
    try {
      const res = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, retailer, promo_depth: promoDepth, promo_duration: promoDuration }),
      });
      const data = await res.json();
      setResult(data);

      // Phase 5: getForecast can return found:false for an unmatched
      // brand/retailer — don't fetch a curve for that (every point would
      // 404 the same way), just show the note from `result` below.
      if (res.ok && data.found !== false) {
        const depths = [5, 10, 15, 20, 25, 30, 40, 50];
        const points = await Promise.all(
          depths.map(async (d) => {
            const r = await fetch("/api/forecast", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ brand, retailer, promo_depth: d, promo_duration: promoDuration }),
            });
            const j = await r.json();
            return { depth: d, lift: j.projected_lift_pct ?? 0 };
          })
        );
        setCurve(points);
      } else {
        setCurve([]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold mb-1">What-If Simulator</h2>
      <p className="text-xs text-muted mb-6">
        Preview a projected lift before committing to a promo — based on a fitted elasticity model.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <label className="text-sm">
          Brand
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="mt-1 w-full bg-panel rounded-lg px-3 py-2 text-sm outline-none"
          />
        </label>
        <label className="text-sm">
          Retailer
          <input
            value={retailer}
            onChange={(e) => setRetailer(e.target.value)}
            className="mt-1 w-full bg-panel rounded-lg px-3 py-2 text-sm outline-none"
          />
        </label>
      </div>

      <label className="block text-sm mb-4">
        Promo depth: {promoDepth}%
        <input
          type="range"
          min={5}
          max={60}
          value={promoDepth}
          onChange={(e) => setPromoDepth(Number(e.target.value))}
          className="w-full mt-1"
        />
      </label>

      <label className="block text-sm mb-6">
        Duration: {promoDuration} weeks
        <input
          type="range"
          min={1}
          max={12}
          value={promoDuration}
          onChange={(e) => setPromoDuration(Number(e.target.value))}
          className="w-full mt-1"
        />
      </label>

      <button
        onClick={runForecast}
        disabled={loading}
        className="bg-accent px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Projecting…" : "Run Forecast"}
      </button>

      {result && result.found === false && (
        <div className="mt-6 bg-panel rounded-lg p-4 text-sm text-amber-300">
          {result.note ?? "No match found for that brand/retailer."}
        </div>
      )}

      {result && result.found !== false && (
        <div className="mt-6 bg-panel rounded-lg p-4">
          <div className="text-sm">
            Projected lift: <span className="text-accent font-semibold">{result.projected_lift_pct}%</span>
          </div>
          <div className="text-sm">
            Estimated incremental sales:{" "}
            <span className="text-accent font-semibold">${(result.estimated_incremental_dollars ?? 0).toLocaleString()}</span>
          </div>
          {result.caveat && <div className="text-xs text-muted mt-2">{result.caveat}</div>}
        </div>
      )}

      {curve.length > 0 && (
        <div className="mt-4 h-56 bg-black/20 rounded-lg p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3a" />
              <XAxis dataKey="depth" tick={{ fill: "#8890a4", fontSize: 11 }} label={{ value: "Promo depth %", position: "insideBottom", offset: -4, fill: "#8890a4", fontSize: 10 }} />
              <YAxis tick={{ fill: "#8890a4", fontSize: 11 }} label={{ value: "Projected lift %", angle: -90, position: "insideLeft", fill: "#8890a4", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#161922", border: "1px solid #2a2e3a" }} />
              <Line type="monotone" dataKey="lift" stroke="#4f7cff" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
