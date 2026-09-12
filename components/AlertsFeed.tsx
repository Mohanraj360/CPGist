"use client";

import { useEffect, useState, useRef } from "react";

interface Alert {
  id: number;
  brand_id: number;
  retailer_id: number;
  category: string;
  region: string | null;
  alert_type: "velocity_swing_down" | "velocity_swing_up";
  week_ending: string;
  swing_pct: number;
  narrative: string;
  created_at: string;
}

// Polls /api/alerts (RLS-scoped, populated by the app/api/cron/detect-
// anomalies job) and renders as a bell + badge that opens a dropdown feed
// — this is the "analyst who's always on shift" surface: alerts show up
// here unprompted, not only when the user happens to ask a chat question
// that would surface the same underlying data.
export default function AlertsFeed() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/alerts");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Failed to load alerts.");
        } else {
          setAlerts(data.alerts ?? []);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    // Alerts are written by a daily cron job, not a live stream — a slow
    // poll is enough to pick up a new run without hammering the endpoint.
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const count = alerts.length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative text-xs px-2.5 py-1 rounded-full bg-panel text-muted hover:text-white hover:bg-white/10 transition-colors"
        aria-label={`${count} alerts`}
      >
        🔔 Alerts
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-[28rem] overflow-y-auto bg-panel border border-white/10 rounded-xl shadow-xl z-50 p-2">
          <div className="text-xs uppercase tracking-wide text-muted px-2 py-1.5">
            Velocity alerts
          </div>

          {loading && <div className="text-sm text-muted px-2 py-3">Loading…</div>}
          {error && <div className="text-sm text-red-400 px-2 py-3">{error}</div>}
          {!loading && !error && alerts.length === 0 && (
            <div className="text-sm text-muted px-2 py-3">No anomalies above threshold right now.</div>
          )}

          {!loading &&
            alerts.map((a) => (
              <div key={a.id} className="px-2 py-2.5 border-t border-white/5 first:border-t-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      a.alert_type === "velocity_swing_down"
                        ? "bg-red-500/20 text-red-300"
                        : "bg-green-500/20 text-green-300"
                    }`}
                  >
                    {a.swing_pct > 0 ? "+" : ""}
                    {a.swing_pct}%
                  </span>
                  <span className="text-[10px] text-muted">
                    {a.category} · {a.region ?? "—"} · week of {a.week_ending}
                  </span>
                </div>
                <p className="text-sm leading-snug">{a.narrative}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
