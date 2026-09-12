"use client";

import { useState } from "react";

export default function FeedbackButtons({ insightSummary }: { insightSummary: string }) {
  const [sent, setSent] = useState<"worked" | "didnt_work" | null>(null);

  async function send(outcome: "worked" | "didnt_work") {
    setSent(outcome);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insight_summary: insightSummary, outcome }),
      });
    } catch (err) {
      console.error("Failed to log feedback:", err);
    }
  }

  return (
    <div className="mt-3 flex items-center gap-3 text-sm">
      <button
        onClick={() => send("worked")}
        disabled={sent !== null}
        className={`px-2 py-1 rounded-md transition-colors ${
          sent === "worked" ? "bg-green-600/30 text-green-300" : "hover:bg-white/10"
        }`}
      >
        👍 Worked
      </button>
      <button
        onClick={() => send("didnt_work")}
        disabled={sent !== null}
        className={`px-2 py-1 rounded-md transition-colors ${
          sent === "didnt_work" ? "bg-red-600/30 text-red-300" : "hover:bg-white/10"
        }`}
      >
        👎 Didn't work
      </button>
      {sent && <span className="text-muted text-xs">Thanks — logged.</span>}
    </div>
  );
}
