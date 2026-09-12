"use client";

import type { ChatMessage } from "@/lib/types";
import { AUDIENCE_LABELS } from "@/lib/types";
import InsightChart from "@/components/InsightChart";
import SourceTrace from "@/components/SourceTrace";
import FeedbackButtons from "@/components/FeedbackButtons";

export default function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  async function exportPdf() {
    const res = await fetch("/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "CPGist Insight",
        narrative: message.text,
        recommendations: message.recommendations,
        sourceTrace: message.sourceTrace,
      }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cpgist-insight.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-2xl rounded-2xl px-4 py-3 ${
          isUser ? "bg-accent text-white" : "bg-panel text-white"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>

        {!isUser && message.audience && (
          <div className="mt-1 mb-2">
            <span className="text-[10px] uppercase tracking-wide text-muted bg-white/5 px-2 py-0.5 rounded-full">
              Framed for: {AUDIENCE_LABELS[message.audience]}
            </span>
          </div>
        )}

        {!isUser && message.recommendations && message.recommendations.length > 0 && (
          <div className="mt-3">
            <div className="text-xs uppercase tracking-wide text-muted mb-1">Recommended actions</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {message.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {!isUser && <InsightChart chartData={message.chartData} />}
        {!isUser && message.sourceTrace && <SourceTrace trace={message.sourceTrace} />}

        {!isUser && (
          <div className="flex items-center justify-between">
            <FeedbackButtons insightSummary={message.text.slice(0, 200)} />
            <button onClick={exportPdf} className="text-xs text-muted hover:text-white underline underline-offset-2">
              Export as PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
