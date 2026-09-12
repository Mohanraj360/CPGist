"use client";

import { useState } from "react";
import type { SourceTraceEntry } from "@/lib/types";

export default function SourceTrace({ trace }: { trace: SourceTraceEntry[] }) {
  const [open, setOpen] = useState(false);

  if (!trace || trace.length === 0) return null;

  return (
    <div className="mt-3 text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-muted hover:text-white transition-colors underline underline-offset-2"
      >
        {open ? "Hide" : "How I found this"}
      </button>
      {open && (
        <div className="mt-2 rounded-lg bg-black/30 p-3 space-y-2">
          {trace.map((entry, i) => (
            <div key={i}>
              <div className="text-accent font-mono">{entry.tool}</div>
              <div className="text-muted font-mono break-all">{JSON.stringify(entry.args)}</div>
              <div className="text-muted">tables: {entry.source_tables.join(", ") || "n/a"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
