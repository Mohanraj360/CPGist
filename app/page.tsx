"use client";

import { useState } from "react";
import ChatUI from "@/components/ChatUI";
import WhatIfSimulator from "@/components/WhatIfSimulator";

const sections = ["Overview", "Analyses", "Data", "Templates", "Insights", "Reports", "Settings", "Help"];

export default function Home() {
  const [tab, setTab] = useState<"chat" | "whatif">("chat");
  const [section, setSection] = useState("Overview");

  return (
    <main className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[224px] shrink-0 border-r border-[var(--line)] bg-white lg:flex lg:flex-col">
          <div className="flex h-16 items-center border-b border-[var(--line)] px-6">
            <span className="text-xl font-semibold tracking-[-0.04em]">CPGist</span>
            <span className="ml-2 rounded bg-[var(--mint-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--mint-strong)]">AI</span>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3 py-5" aria-label="Main navigation">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Workspace</p>
            {sections.map((item) => (
              <button key={item} type="button" onClick={() => setSection(item)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${section === item ? "bg-[var(--mint-soft)] font-medium text-[var(--mint-strong)]" : "text-[var(--muted)] hover:bg-[var(--canvas)] hover:text-[var(--ink)]"}`}>
                <span className={`size-1.5 rounded-full ${section === item ? "bg-[var(--mint-strong)]" : "bg-[var(--line-strong)]"}`} aria-hidden="true" />
                {item}
              </button>
            ))}
          </nav>
          <div className="border-t border-[var(--line)] p-4">
            <div className="rounded-xl bg-[var(--canvas)] p-3">
              <p className="text-xs font-medium">India / Gulf / APAC</p>
              <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">Synthetic retail data with Quick Commerce coverage.</p>
            </div>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-[var(--line)] bg-white px-5 sm:px-8">
            <div className="flex items-center gap-3 lg:hidden"><span className="text-lg font-semibold tracking-[-0.04em]">CPGist</span><span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{section}</span></div>
            <div className="hidden items-center gap-2 text-sm text-[var(--muted)] lg:flex"><span>Workspace</span><span>/</span><span className="font-medium text-[var(--ink)]">{section}</span></div>
            <div className="flex items-center gap-3"><span className="hidden rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--muted)] sm:inline">Data refresh: daily</span><div className="flex size-8 items-center justify-center rounded-full bg-[var(--navy)] text-xs font-semibold text-white">MR</div></div>
          </header>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-[var(--line)] bg-white px-5 py-3 sm:px-8">
              <div><h1 className="text-base font-semibold">{tab === "chat" ? "Analysis workspace" : "Promo scenario planner"}</h1><p className="text-xs text-[var(--muted)]">{tab === "chat" ? "Turn retail data into a clear next move." : "Model projected lift before you commit."}</p></div>
              <div className="flex rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-1" role="tablist" aria-label="Analysis mode">
                <button type="button" role="tab" aria-selected={tab === "chat"} onClick={() => setTab("chat")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === "chat" ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--muted)]"}`}>AI analyst</button>
                <button type="button" role="tab" aria-selected={tab === "whatif"} onClick={() => setTab("whatif")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === "whatif" ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--muted)]"}`}>What-if</button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">{tab === "chat" ? <ChatUI /> : <WhatIfSimulator />}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
