"use client";

import { useState } from "react";
import ChatUI from "@/components/ChatUI";
import WhatIfSimulator from "@/components/WhatIfSimulator";

const sections = ["Overview", "Analyses", "Data", "Templates", "Insights", "Reports", "Settings", "Help"];

const sectionContent: Record<string, { eyebrow: string; title: string; description: string; items: string[] }> = {
  Analyses: { eyebrow: "Analysis library", title: "Review your analysis history", description: "Saved answers and source traces will appear here as you run more questions.", items: ["Brand ranking", "Promo lift analysis", "Distribution whitespace"] },
  Data: { eyebrow: "Data catalog", title: "Your retail context is ready", description: "CPGist is connected to brands, retailers, promotions, regions, and periods.", items: ["Brands", "Retailers & channels", "Promotions", "Regions & periods"] },
  Templates: { eyebrow: "Verified workflows", title: "Start from a proven question", description: "Choose a workflow to load a complete prompt into the analyst.", items: ["Brand Ranking", "Promo Lift Analysis", "Channel Mix Shift"] },
  Insights: { eyebrow: "Signal center", title: "Insights that need attention", description: "Velocity swings, distribution gaps, and promo opportunities will be collected here.", items: ["Velocity changes", "Distribution opportunities", "Competitive activity"] },
  Reports: { eyebrow: "Reporting", title: "Build a clear readout", description: "Exported insights and stakeholder-ready summaries will appear here.", items: ["Executive summary", "Category review", "Trade planning"] },
  Settings: { eyebrow: "Workspace settings", title: "Configure your analyst workspace", description: "Your current workspace is using synthetic India, Gulf, and APAC retail coverage.", items: ["Audience framing", "Data refresh: daily", "Connected Supabase project"] },
  Help: { eyebrow: "Help center", title: "Ask better retail questions", description: "Use plain English and include a brand, category, retailer, or date range when relevant.", items: ["Try a verified workflow", "Switch the audience frame", "Export a source-traceable answer"] },
};

export default function Home() {
  const [tab, setTab] = useState<"chat" | "whatif">("chat");
  const [section, setSection] = useState("Overview");

  function selectSection(item: string) {
    setSection(item);
    if (item === "Overview" || item === "Analyses") setTab("chat");
  }

  const content = sectionContent[section];

  return (
    <main className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[224px] shrink-0 border-r border-[var(--line)] bg-white lg:flex lg:flex-col">
          <div className="flex h-16 items-center border-b border-[var(--line)] px-6"><span className="text-xl font-semibold tracking-[-0.04em]">CPGist</span><span className="ml-2 rounded bg-[var(--mint-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--mint-strong)]">AI</span></div>
          <nav className="flex flex-1 flex-col gap-1 px-3 py-5" aria-label="Main navigation"><p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Workspace</p>{sections.map((item) => <button key={item} type="button" onClick={() => selectSection(item)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${section === item ? "bg-[var(--mint-soft)] font-medium text-[var(--mint-strong)]" : "text-[var(--muted)] hover:bg-[var(--canvas)] hover:text-[var(--ink)]"}`}><span className={`size-1.5 rounded-full ${section === item ? "bg-[var(--mint-strong)]" : "bg-[var(--line-strong)]"}`} aria-hidden="true" />{item}</button>)}</nav>
          <div className="border-t border-[var(--line)] p-4"><div className="rounded-xl bg-[var(--canvas)] p-3"><p className="text-xs font-medium">India / Gulf / APAC</p><p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">Synthetic retail data with Quick Commerce coverage.</p></div></div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-[var(--line)] bg-white px-5 sm:px-8"><div className="flex items-center gap-3 lg:hidden"><span className="text-lg font-semibold tracking-[-0.04em]">CPGist</span><span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{section}</span></div><div className="hidden items-center gap-2 text-sm text-[var(--muted)] lg:flex"><span>Workspace</span><span>/</span><span className="font-medium text-[var(--ink)]">{section}</span></div><div className="flex items-center gap-3"><span className="hidden rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--muted)] sm:inline">Data refresh: daily</span><div className="flex size-8 items-center justify-center rounded-full bg-[var(--navy)] text-xs font-semibold text-white">MR</div></div></header>
          <div className="flex min-h-0 flex-1 flex-col"><div className="flex items-center justify-between border-b border-[var(--line)] bg-white px-5 py-3 sm:px-8"><div><h1 className="text-base font-semibold">{tab === "chat" ? section === "Overview" || section === "Analyses" ? "Analysis workspace" : content?.title : "Promo scenario planner"}</h1><p className="text-xs text-[var(--muted)]">{tab === "chat" ? section === "Overview" || section === "Analyses" ? "Turn retail data into a clear next move." : content?.description : "Model projected lift before you commit."}</p></div><div className="flex rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-1" role="tablist" aria-label="Analysis mode"><button type="button" role="tab" aria-selected={tab === "chat"} onClick={() => setTab("chat")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === "chat" ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--muted)]"}`}>AI analyst</button><button type="button" role="tab" aria-selected={tab === "whatif"} onClick={() => setTab("whatif")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === "whatif" ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--muted)]"}`}>What-if</button></div></div>
            <div className="min-h-0 flex-1 overflow-hidden">{tab === "whatif" ? <WhatIfSimulator /> : section === "Overview" || section === "Analyses" ? <ChatUI /> : <section className="h-full overflow-y-auto bg-[var(--canvas)] p-5 sm:p-8"><div className="mx-auto max-w-3xl"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--mint-strong)]">{content.eyebrow}</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{content.title}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">{content.description}</p><div className="mt-8 grid gap-3 sm:grid-cols-3">{content.items.map((item) => <button key={item} type="button" onClick={() => { setSection("Overview"); setTab("chat"); }} className="rounded-xl border border-[var(--line)] bg-white p-4 text-left text-sm transition-colors hover:border-[var(--mint-strong)] hover:bg-[var(--mint-soft)]">{item}<span className="mt-3 block text-xs text-[var(--muted)]">Open in analyst →</span></button>)}</div></div></section>}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
