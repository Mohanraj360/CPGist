"use client";

import { useMemo, useState } from "react";
import { ArrowUp, BarChart3, ChevronDown, Command, FileText, HelpCircle, History, LayoutDashboard, Menu, Search, Settings2, Sparkles, X } from "lucide-react";
import ChatUI from "@/components/ChatUI";

const prompts = [
  "What changed in category performance this week?",
  "Where is distribution holding back growth?",
  "Which brands are gaining share and why?",
  "Show me the biggest promotion opportunities.",
];

export function CPGistWorkspace() {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<"executive" | "analyst" | "operator">("executive");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const prompt = useMemo(() => prompts[activePrompt % prompts.length], [activePrompt]);

  function submit() {
    if (!query.trim()) return;
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-[#07100f] text-[#e8f3ee]">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#07100f]/90 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button aria-label="Open navigation" className="rounded-lg p-2 text-[#8da19a] hover:bg-white/[0.06] hover:text-white lg:hidden" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <div className="flex items-center gap-2.5"><div className="grid size-8 place-items-center rounded-lg bg-[#9de6bc] text-[#07100f]"><Sparkles size={17} /></div><span className="text-[15px] font-semibold tracking-tight">CPGist</span></div>
            <span className="hidden h-5 w-px bg-white/10 sm:block" />
            <span className="hidden text-xs text-[#7e948b] sm:block">Revenue intelligence</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCommandOpen(true)} className="hidden items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-[#8da19a] hover:border-white/20 hover:text-white md:flex"><Command size={14} /> Search <kbd className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[10px]">⌘K</kbd></button>
            <button aria-label="Help" className="rounded-lg p-2 text-[#8da19a] hover:bg-white/[0.06] hover:text-white"><HelpCircle size={18} /></button>
            <div className="grid size-8 place-items-center rounded-full border border-[#9de6bc]/30 bg-[#17362c] text-xs font-semibold text-[#baf5d0]">MR</div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px]">
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-white/[0.07] bg-[#091412] px-4 pt-20 transition-transform lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:translate-x-0 lg:bg-transparent lg:px-5 lg:pt-6 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="mb-7 flex items-center justify-between lg:hidden"><span className="text-sm font-semibold">Workspace</span><button onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#60756d]">Workspace</p>
          <nav className="space-y-1">
            {[{ Icon: LayoutDashboard, label: "Overview", active: true }, { Icon: BarChart3, label: "Analyses", active: false }, { Icon: History, label: "Recent", active: false }, { Icon: FileText, label: "Reports", active: false }].map(({ Icon, label, active }) => <button key={label} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${active ? "bg-[#9de6bc]/10 font-medium text-[#baf5d0]" : "text-[#8da19a] hover:bg-white/[0.05] hover:text-white"}`}><Icon size={17} />{label}</button>)}
          </nav>
          <div className="my-7 h-px bg-white/[0.07]" />
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#60756d]">Manage</p>
          <nav className="space-y-1"><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#8da19a] hover:bg-white/[0.05] hover:text-white"><Settings2 size={17} />Settings</button></nav>
          <div className="absolute bottom-6 left-5 right-5 hidden rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 lg:block"><p className="text-xs font-medium text-[#c9d9d2]">Data through Sep 13, 2026</p><p className="mt-1 text-[11px] text-[#71877e]">Freshness status: <span className="text-[#9de6bc]">Healthy</span></p></div>
        </aside>
        {sidebarOpen && <button className="fixed inset-0 z-30 bg-black/50 lg:hidden" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

        <main className="min-w-0 flex-1 px-4 pb-16 pt-8 sm:px-8 lg:px-14 lg:pt-12">
          {!submitted ? <section className="mx-auto max-w-4xl">
            <div className="mb-14 max-w-2xl"><p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-[#9de6bc]">Good morning, Mohanraj</p><h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#eef8f2] sm:text-5xl">What should we investigate?</h1><p className="mt-4 max-w-xl text-sm leading-6 text-[#8da19a] sm:text-base">Ask a question about your business. CPGist will connect the dots across your retail data and surface the decisions that matter.</p></div>
            <div className="mb-10 grid gap-3 sm:grid-cols-2">{prompts.map((item, i) => <button key={item} onClick={() => { setQuery(item); setActivePrompt(i); }} className="group rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#9de6bc]/30 hover:bg-[#9de6bc]/[0.04]"><span className="mb-7 block text-[11px] font-medium uppercase tracking-[0.16em] text-[#60756d]">{i === 0 ? "Performance" : i === 1 ? "Distribution" : i === 2 ? "Share" : "Promotion"}</span><span className="text-sm leading-5 text-[#c5d5ce] group-hover:text-[#e8f3ee]">{item}</span><span className="mt-4 block text-[#6f887d] transition group-hover:translate-x-1 group-hover:text-[#9de6bc]">→</span></button>)}</div>
            <div className="rounded-2xl border border-[#9de6bc]/20 bg-[#0d1c18] p-3 shadow-2xl shadow-black/20"><textarea value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); submit(); } }} placeholder={prompt} rows={3} className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-[#e8f3ee] outline-none placeholder:text-[#60756d]" /><div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] px-2 pt-3"><div className="flex items-center gap-2"><span className="text-[11px] text-[#71877e]">Answer for</span><div className="flex rounded-lg bg-white/[0.05] p-0.5">{([["executive", "Executive"], ["analyst", "Analyst"], ["operator", "Operator"]] as const).map(([value, label]) => <button key={value} onClick={() => setAudience(value)} className={`rounded-md px-2.5 py-1.5 text-[11px] ${audience === value ? "bg-[#9de6bc] font-medium text-[#07100f]" : "text-[#8da19a]"}`}>{label}</button>)}</div></div><button onClick={submit} disabled={!query.trim()} className="flex items-center gap-2 rounded-lg bg-[#9de6bc] px-4 py-2 text-xs font-semibold text-[#07100f] transition hover:bg-[#baf5d0] disabled:cursor-not-allowed disabled:opacity-30">Investigate <ArrowUp size={14} /></button></div></div>
            <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[#60756d]"><span>Press</span><kbd className="rounded border border-white/10 px-1.5 py-0.5">Enter</kbd><span>to run</span><span className="mx-1">·</span><button onClick={() => setCommandOpen(true)} className="hover:text-[#9de6bc]">⌘K for shortcuts</button></div>
          </section> : <ChatUI initialContext={{ source: "home", label: audience, prompt: query }} />}
        </main>
      </div>
      {commandOpen && <div className="fixed inset-0 z-50 grid place-items-start bg-black/60 px-4 pt-24" onClick={() => setCommandOpen(false)}><div role="dialog" aria-modal="true" className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#10201b] shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3"><Search size={17} className="text-[#71877e]" /><input autoFocus placeholder="Search workspace..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#60756d]" /><kbd className="text-[10px] text-[#60756d]">ESC</kbd></div><div className="p-2"><button onClick={() => { setCommandOpen(false); setSubmitted(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-[#c5d5ce] hover:bg-white/[0.06]"><Sparkles size={16} className="text-[#9de6bc]" />New investigation</button><button className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-[#c5d5ce] hover:bg-white/[0.06]"><History size={16} className="text-[#9de6bc]" />Open recent analyses</button></div></div></div>}
    </div>
  );
}
