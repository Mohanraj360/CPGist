"use client";

import { useState } from "react";
import ChatUI from "@/components/ChatUI";
import WhatIfSimulator from "@/components/WhatIfSimulator";
import { TEMPLATES } from "@/components/Sidebar";

type Section = "Overview" | "Analyses" | "Data" | "Templates" | "Insights" | "Reports" | "Settings" | "Help";

type AnalystContext = { source: string; label: string; prompt?: string } | null;

const sections: Section[] = ["Overview", "Analyses", "Data", "Templates", "Insights", "Reports", "Settings", "Help"];
const dataSets = [
  ["Brands", "1,245 records", "Connected"],
  ["Retailers & channels", "86 records", "Connected"],
  ["Promotions", "3,890 records", "Connected"],
  ["Regions & periods", "24 regions", "Connected"],
];
const insights = [
  ["Opportunity", "Distribution whitespace in Gulf", "Urban Crisps trails category coverage by 8 points."],
  ["Risk", "Promo lift is weakening", "Bold Snacks lift is down versus the previous period."],
  ["Trend", "Quick Commerce is gaining mix", "The channel is growing faster than Modern Trade."],
];

export default function Home() {
  const [section, setSection] = useState<Section>("Overview");
  const [tab, setTab] = useState<"chat" | "whatif">("chat");
  const [context, setContext] = useState<AnalystContext>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  function openAnalyst(next?: AnalystContext) {
    setContext(next ?? null);
    setSection("Overview");
    setTab("chat");
    setMobileOpen(false);
  }

  function navigate(next: Section) {
    setSection(next);
    setMobileOpen(false);
    if (next === "Overview" || next === "Analyses") setTab("chat");
  }

  return (
    <main className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <div className="flex min-h-screen">
        <aside className={`${mobileOpen ? "fixed inset-y-0 left-0 z-40 flex w-72" : "hidden"} w-[248px] shrink-0 flex-col border-r border-[var(--line)] bg-white lg:flex`}>
          <div className="flex h-16 items-center justify-between border-b border-[var(--line)] px-6"><button type="button" onClick={() => navigate("Overview")} className="text-xl font-semibold tracking-[-0.04em]">CPGist <span className="rounded bg-[var(--mint-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--mint-strong)]">AI</span></button><button type="button" className="text-xl lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation">×</button></div>
          <nav className="flex flex-1 flex-col gap-1 px-3 py-5" aria-label="Main navigation"><p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Workspace</p>{sections.map((item) => <button key={item} type="button" onClick={() => navigate(item)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${section === item ? "bg-[var(--mint-soft)] font-medium text-[var(--mint-strong)]" : "text-[var(--muted)] hover:bg-[var(--canvas)] hover:text-[var(--ink)]"}`}><span className={`size-1.5 rounded-full ${section === item ? "bg-[var(--mint-strong)]" : "bg-[var(--line-strong)]"}`} aria-hidden="true" />{item}</button>)}</nav>
          <button type="button" onClick={() => openAnalyst()} className="m-4 rounded-xl bg-[var(--navy)] p-3 text-left text-white"><p className="text-sm font-medium">New analysis</p><p className="mt-1 text-[11px] text-white/70">Ask a question or choose a workflow</p></button>
        </aside>
        {mobileOpen && <button type="button" className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-[var(--line)] bg-white px-5 sm:px-8"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileOpen(true)} className="text-xl lg:hidden" aria-label="Open navigation">☰</button><div className="flex items-center gap-2 text-sm text-[var(--muted)]"><span className="hidden sm:inline">Workspace /</span><span className="font-medium text-[var(--ink)]">{section}</span></div></div><div className="flex items-center gap-3"><span className="hidden rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--muted)] sm:inline">Data connection: ready</span><div className="flex size-8 items-center justify-center rounded-full bg-[var(--navy)] text-xs font-semibold text-white">MR</div></div></header>
          <div className="flex min-h-0 flex-1 flex-col"><div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-white px-5 py-4 sm:px-8"><div><h1 className="text-base font-semibold">{section === "Overview" || section === "Analyses" ? "AI analyst" : section}</h1><p className="text-xs text-[var(--muted)]">{section === "Overview" ? "Ask questions about your CPG business." : "Turn business context into a clear next move."}</p></div><div className="flex rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-1" role="tablist" aria-label="Analysis mode"><button type="button" role="tab" aria-selected={tab === "chat"} onClick={() => { setTab("chat"); setSection("Overview"); }} className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === "chat" ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--muted)]"}`}>AI analyst</button><button type="button" role="tab" aria-selected={tab === "whatif"} onClick={() => setTab("whatif")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === "whatif" ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--muted)]"}`}>What-if</button></div></div>
            <div className="min-h-0 flex-1 overflow-hidden">{tab === "whatif" ? <WhatIfSimulator /> : section === "Overview" || section === "Analyses" ? <ChatUI initialContext={context} /> : <SectionView section={section} onOpenAnalyst={openAnalyst} onNavigate={navigate} />}</div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SectionView({ section, onOpenAnalyst, onNavigate }: { section: Section; onOpenAnalyst: (context: AnalystContext) => void; onNavigate: (section: Section) => void }) {
  const templateItems = TEMPLATES.slice(0, 6);
  if (section === "Templates") return <div className="h-full overflow-y-auto p-5 sm:p-8"><div className="mx-auto max-w-5xl"><p className="eyebrow">Verified workflows</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Start from a proven question</h2><p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">Each workflow carries its business context into the analyst so you can edit, run, and continue the analysis.</p><div className="mt-8 grid gap-4 md:grid-cols-2">{templateItems.map((item) => <article key={item.label} className="rounded-2xl border border-[var(--line)] bg-white p-5"><p className="text-xs font-semibold text-[var(--mint-strong)]">{item.group}</p><h3 className="mt-2 font-semibold">{item.label}</h3><p className="mt-2 text-sm text-[var(--muted)]">{item.prompt}</p><div className="mt-5 flex gap-2"><button type="button" onClick={() => onOpenAnalyst({ source: "workflow", label: item.label, prompt: item.prompt })} className="rounded-lg bg-[var(--navy)] px-3 py-2 text-xs font-semibold text-white">Open in analyst</button><button type="button" onClick={() => onOpenAnalyst({ source: "workflow", label: item.label, prompt: item.prompt })} className="rounded-lg border border-[var(--line-strong)] px-3 py-2 text-xs font-semibold">Run workflow</button></div></article>)}</div></div></div>;
  if (section === "Data") return <div className="h-full overflow-y-auto p-5 sm:p-8"><div className="mx-auto max-w-5xl"><p className="eyebrow">Data hub</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Business data status</h2><p className="mt-3 text-sm text-[var(--muted)]">Connected datasets available to the analyst. Records are shown only where the workspace has context.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{dataSets.map(([name, records, status]) => <article key={name} className="rounded-2xl border border-[var(--line)] bg-white p-5"><div className="flex items-center justify-between"><h3 className="font-semibold">{name}</h3><span className="status-pill">{status}</span></div><p className="mt-5 text-2xl font-semibold">{records}</p><p className="mt-1 text-xs text-[var(--muted)]">Available for analysis</p><button type="button" onClick={() => onOpenAnalyst({ source: "data", label: name, prompt: `Analyze ${name.toLowerCase()} performance and identify the most important business opportunities and risks.` })} className="mt-5 text-xs font-semibold text-[var(--mint-strong)]">Open in analyst →</button></article>)}</div></div></div>;
  if (section === "Insights") return <div className="h-full overflow-y-auto p-5 sm:p-8"><div className="mx-auto max-w-5xl"><p className="eyebrow">Signal center</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Insights that need attention</h2><div className="mt-8 grid gap-4">{insights.map(([severity, title, summary]) => <article key={title} className="rounded-2xl border border-[var(--line)] bg-white p-5"><span className="status-pill">{severity}</span><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-2 text-sm text-[var(--muted)]">{summary}</p><button type="button" onClick={() => onOpenAnalyst({ source: "insight", label: title, prompt: `Investigate this insight: ${title}. ${summary} Analyze drivers, affected retailers, regions, promotions, and recommended actions.` })} className="mt-4 text-xs font-semibold text-[var(--mint-strong)]">Investigate →</button></article>)}</div></div></div>;
  const copy: Record<string, [string, string, string[]]> = { Reports: ["Reporting", "Create a clear readout", ["Recent reports", "Saved analyses", "Executive business review"]], Settings: ["Workspace settings", "Configure your analyst experience", ["Profile and preferences", "AI response preferences", "Business data connection"]], Help: ["Help center", "Ask better retail questions", ["Use a verified workflow", "Add a brand, category, retailer, or date range", "Export a source-traceable answer"]] };
  const [eyebrow, title, items] = copy[section] ?? ["Analysis library", "Review your analysis history", ["Recent analyses", "Saved analyses", "Drafts"]];
  return <div className="h-full overflow-y-auto p-5 sm:p-8"><div className="mx-auto max-w-4xl"><p className="eyebrow">{eyebrow}</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{title}</h2><p className="mt-3 max-w-xl text-sm text-[var(--muted)]">Your workspace actions stay connected to the analyst. Choose an item below to continue.</p><div className="mt-8 grid gap-3 sm:grid-cols-3">{items.map((item) => <button key={item} type="button" onClick={() => section === "Reports" ? onNavigate("Overview") : onOpenAnalyst({ source: section.toLowerCase(), label: item, prompt: `Help me with ${item.toLowerCase()} for my CPG business.` })} className="rounded-2xl border border-[var(--line)] bg-white p-5 text-left text-sm transition hover:border-[var(--mint-strong)] hover:bg-[var(--mint-soft)]"><span className="font-semibold">{item}</span><span className="mt-3 block text-xs text-[var(--muted)]">Continue →</span></button>)}</div></div></div>;
}
