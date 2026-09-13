"use client";

import type { ChatMessage } from "@/lib/types";
import { AUDIENCE_LABELS } from "@/lib/types";
import InsightChart from "@/components/InsightChart";
import SourceTrace from "@/components/SourceTrace";
import FeedbackButtons from "@/components/FeedbackButtons";

export default function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const recommendations = message.recommendations ?? [];
  const audienceLabel = message.audience ? AUDIENCE_LABELS[message.audience] : "";

  async function exportPdf() {
    const res = await fetch("/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "CPGist Insight", narrative: message.text, recommendations, sourceTrace: message.sourceTrace }),
    });
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cpgist-insight.pdf";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (isUser) {
    return <div className="flex justify-end"><div className="max-w-xl rounded-xl bg-[var(--navy)] px-4 py-3 text-sm leading-6 text-white">{message.text}</div></div>;
  }

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--mint-strong)]">Analysis result</p><p className="mt-1 text-xs text-[var(--muted)]">Source-traceable answer from your retail dataset</p></div>
        {audienceLabel && <span className="rounded-full bg-[var(--mint-soft)] px-2.5 py-1 text-[10px] font-medium text-[var(--mint-strong)]">{audienceLabel}</span>}
      </div>
      <div className="px-5 py-5">
        {message.executiveSummary && message.executiveSummary !== message.text && <p className="mb-3 rounded-xl bg-[var(--canvas)] p-3 text-sm font-medium leading-6 text-[var(--ink)]">{message.executiveSummary}</p>}
        <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--ink)]">{message.text}</p>
        {message.metrics && message.metrics.length > 0 && <div className="mt-5 grid gap-2 sm:grid-cols-3">{message.metrics.map((metric) => <div key={metric.label} className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-3"><p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{metric.label}</p><p className="mt-1 text-sm font-semibold text-[var(--ink)]">{metric.value}</p></div>)}</div>}
        {message.insights && message.insights.length > 1 && <section className="mt-5"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Key insights</p><ul className="flex flex-col gap-2 text-sm leading-6 text-[var(--ink)]">{message.insights.filter((insight) => insight !== message.text).map((insight) => <li key={insight}>{insight}</li>)}</ul></section>}
        {recommendations.length > 0 && <section className="mt-6 rounded-xl bg-[var(--canvas)] p-4"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Recommended actions</p><ul className="flex flex-col gap-2 text-sm leading-5 text-[var(--ink)]">{recommendations.map((recommendation, index) => <li key={`${index}-${recommendation}`} className="flex gap-2"><span className="text-[var(--mint-strong)]">{String(index + 1).padStart(2, "0")}</span><span>{recommendation}</span></li>)}</ul></section>}
        {message.chartData !== undefined && message.chartData !== null ? <InsightChart chartData={message.chartData} /> : null}
        {message.sourceTrace && <div className="mt-5"><SourceTrace trace={message.sourceTrace} /></div>}
        <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-4"><FeedbackButtons insightSummary={message.text.slice(0, 200)} /><button onClick={exportPdf} className="text-xs text-[var(--muted)] underline underline-offset-2 hover:text-[var(--ink)]">Export as PDF</button></div>
      </div>
    </article>
  );
}
