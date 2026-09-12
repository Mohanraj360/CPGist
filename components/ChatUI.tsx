"use client";

import { useState } from "react";
import Sidebar, { TEMPLATES } from "@/components/Sidebar";
import ChatMessageBubble from "@/components/ChatMessageBubble";
import SignOutButton from "@/components/SignOutButton";
import AlertsFeed from "@/components/AlertsFeed";
import type { ChatMessage, AudienceSelection } from "@/lib/types";
import { AUDIENCE_LABELS } from "@/lib/types";

const AUDIENCE_OPTIONS: { value: AudienceSelection; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "category_manager", label: AUDIENCE_LABELS.category_manager },
  { value: "trade", label: AUDIENCE_LABELS.trade },
  { value: "supply_planning", label: AUDIENCE_LABELS.supply_planning },
  { value: "exec", label: AUDIENCE_LABELS.exec },
];

export default function ChatUI() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [audience, setAudience] = useState<AudienceSelection>("auto");

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
    setInput(""); setLoading(true);
    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, audience }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Analysis failed (${res.status}).`);
      }
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "agent", text: data.narrative || "The analyst returned no narrative.", recommendations: data.recommendations, chartData: data.chartData, sourceTrace: data.sourceTrace, audience: data.audience }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "agent", text: `Request failed: ${err.message}` }]);
    } finally { setLoading(false); }
  }

  const grouped = ["Analyze", "Discover", "Create"].map((group) => ({ group, items: TEMPLATES.filter((item) => item.group === group).slice(0, 2) }));

  return (
    <div className="flex h-full min-h-0">
      <Sidebar onSelectTemplate={(prompt) => setInput(prompt)} />
      <section className="flex min-w-0 flex-1 flex-col bg-[var(--canvas)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-white px-5 py-3 sm:px-8"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[var(--mint-strong)]" /><span className="text-xs text-[var(--muted)]">AI analyst online</span></div><div className="flex items-center gap-2"><AlertsFeed /><SignOutButton /></div></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-8">
          {messages.length === 0 ? <div className="mx-auto max-w-3xl"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--mint-strong)]">Good morning, analyst</p><h2 className="max-w-xl text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-4xl">What would you like to understand about your business?</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Ask a question in plain English. CPGist will connect the dots across brands, channels, promotions, and regions.</p><div className="mt-8 grid gap-3 sm:grid-cols-3">{grouped.map(({ group, items }) => <div key={group} className="rounded-xl border border-[var(--line)] bg-white p-3"><p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{group}</p>{items.map((item) => <button key={item.label} type="button" onClick={() => setInput(item.prompt)} className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs leading-4 text-[var(--ink)] hover:bg-[var(--canvas)]"><span>{item.label}</span><span className="text-[var(--muted)]">→</span></button>)}</div>)}</div></div> : <div className="mx-auto flex max-w-3xl flex-col gap-5">{messages.map((message) => <ChatMessageBubble key={message.id} message={message} />)}{loading && <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><span className="size-2 animate-pulse rounded-full bg-[var(--mint-strong)]" />Analyzing your data…</div>}</div>}
        </div>
        <div className="border-t border-[var(--line)] bg-white px-5 py-4 sm:px-8"><div className="mx-auto max-w-3xl"><div className="mb-3 flex items-center gap-2 overflow-x-auto"><span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Frame for</span>{AUDIENCE_OPTIONS.map((opt) => <button key={opt.value} type="button" onClick={() => setAudience(opt.value)} className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${audience === opt.value ? "border-[var(--mint-strong)] bg-[var(--mint-soft)] text-[var(--mint-strong)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"}`}>{opt.label}</button>)}</div><form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--canvas)] p-2 shadow-sm"><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe a retail-analytics task…" aria-label="Analysis prompt" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[var(--muted)]" /><button type="submit" disabled={loading || !input.trim()} className="rounded-lg bg-[var(--navy)] px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-40">Run analysis</button></form><p className="mt-2 text-[10px] text-[var(--muted)]">Use verified templates for faster, source-traceable answers.</p></div></div>
      </section>
      <aside className="hidden w-[220px] shrink-0 border-l border-[var(--line)] bg-white p-5 2xl:block"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Context</p><div className="mt-5 flex flex-col gap-5"><div><p className="text-xs font-medium">Audience</p><p className="mt-1 text-xs text-[var(--muted)]">{audience === "auto" ? "Auto-detected" : AUDIENCE_LABELS[audience]}</p></div><div><p className="text-xs font-medium">Analysis status</p><p className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]"><span className="size-1.5 rounded-full bg-[var(--mint-strong)]" />Ready for a question</p></div><div><p className="text-xs font-medium">Available context</p><p className="mt-2 leading-6 text-xs text-[var(--muted)]">Brands<br />Retailers & channels<br />Promotions<br />Regions & periods</p></div></div></aside>
    </div>
  );
}
