"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUp, BarChart3, Command, FileText, HelpCircle, History, LayoutDashboard, Menu, Moon, Search, Settings2, Sparkles, Sun, X } from "lucide-react";
import ChatUI from "@/components/ChatUI";

const prompts = [
  ["Performance", "What changed in category performance this week?"],
  ["Distribution", "Where is distribution holding back growth?"],
  ["Share", "Which brands are gaining share and why?"],
  ["Promotion", "Show me the biggest promotion opportunities."],
] as const;
const navItems = [{ label: "Overview", Icon: LayoutDashboard }, { label: "Analyses", Icon: BarChart3 }, { label: "Recent", Icon: History }, { label: "Reports", Icon: FileText }];

type Audience = "executive" | "analyst" | "operator";

export function CPGistWorkspace() {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<Audience>("executive");
  const [dark, setDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Overview");
  const [submitted, setSubmitted] = useState(false);
  const prompt = useMemo(() => prompts[0][1], []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("cpgist-theme");
    if (savedTheme) setDark(savedTheme === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    window.localStorage.setItem("cpgist-theme", dark ? "dark" : "light");
  }, [dark]);

  function startAnalysis(nextQuery = query) {
    if (!nextQuery.trim()) return;
    setQuery(nextQuery);
    setSubmitted(true);
    setSidebarOpen(false);
  }
  function resetAnalysis() { setQuery(""); setSubmitted(false); setActiveNav("Overview"); }

  return (
    <div className="min-h-screen bg-[var(--ink-deep)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-30 border-b border-[var(--line-dark)] bg-[var(--ink-deep)]/90 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><button aria-label="Open navigation" className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-white/[.06] lg:hidden" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><button onClick={resetAnalysis} className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-[var(--accent)] text-[var(--ink-deep)]"><Sparkles size={17} /></span><span className="text-[15px] font-semibold tracking-tight">CPGist</span></button><span className="hidden h-5 w-px bg-white/10 sm:block" /><span className="hidden text-xs text-[var(--text-secondary)] sm:block">Revenue intelligence</span></div>
          <div className="flex items-center gap-2"><button onClick={() => setCommandOpen(true)} className="hidden items-center gap-2 rounded-lg border border-[var(--line-dark)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] md:flex"><Command size={14} /> Search <kbd className="rounded bg-white/[.07] px-1.5 py-0.5 text-[10px]">⌘K</kbd></button><button aria-label="Toggle theme" onClick={() => setDark((value) => !value)} className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-white/[.06]">{dark ? <Sun size={18} /> : <Moon size={18} />}</button><button aria-label="Help" onClick={() => setHelpOpen(true)} className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-white/[.06]"><HelpCircle size={18} /></button><div className="grid size-8 place-items-center rounded-full border border-[var(--accent)]/30 bg-[var(--surface)] text-xs font-semibold text-[var(--accent)]">MR</div></div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1500px]">
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-[var(--line-dark)] bg-[var(--surface)] px-4 pt-20 transition-transform duration-200 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:translate-x-0 lg:bg-transparent lg:px-5 lg:pt-6 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="mb-7 flex items-center justify-between lg:hidden"><span className="text-sm font-semibold">Workspace</span><button onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--text-tertiary)]">Workspace</p>
          <nav className="space-y-1">{navItems.map(({ label, Icon }) => <button key={label} onClick={() => { setActiveNav(label); setSidebarOpen(false); if (label === "Overview") resetAnalysis(); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${activeNav === label ? "bg-[var(--accent)]/10 font-medium text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-white/[.05] hover:text-white"}`}><Icon size={17} />{label}</button>)}</nav>
          <div className="my-7 h-px bg-[var(--line-dark)]" /><p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--text-tertiary)]">Manage</p><button onClick={() => setSettingsOpen(true)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-white/[.05] hover:text-white"><Settings2 size={17} />Settings</button>
          <div className="absolute bottom-6 left-5 right-5 hidden rounded-xl border border-[var(--line-dark)] bg-white/[.025] p-3 lg:block"><p className="text-xs font-medium">Data through Sep 13, 2026</p><p className="mt-1 text-[11px] text-[var(--text-secondary)]">Freshness status: <span className="text-[var(--success)]">Healthy</span></p></div>
        </aside>
        {sidebarOpen && <button className="fixed inset-0 z-30 bg-black/50 lg:hidden" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
        <main className="min-w-0 flex-1 px-4 pb-16 pt-8 sm:px-8 lg:px-14 lg:pt-12">
          {!submitted ? <section className="mx-auto max-w-4xl animate-fade-up"><div className="mb-14 max-w-2xl"><p className="mb-4 text-xs font-medium uppercase tracking-[.2em] text-[var(--accent)]">Good morning, Mohanraj</p><h1 className="text-3xl font-semibold tracking-[-.035em] sm:text-5xl">What should we investigate?</h1><p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">Ask a question about your business. CPGist will connect the dots across your retail data and surface the decisions that matter.</p></div><div className="mb-10 grid gap-3 sm:grid-cols-2">{prompts.map(([category, item], i) => <button key={item} onClick={() => startAnalysis(item)} className="group animate-fade-up rounded-xl border border-[var(--line-dark)] bg-[var(--surface)] p-4 text-left transition duration-200 hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-lg hover:shadow-black/20" style={{ animationDelay: `${i * 70}ms` }}><span className="mb-7 block text-[11px] font-medium uppercase tracking-[.16em] text-[var(--text-tertiary)]">{category}</span><span className="text-sm leading-5 text-[var(--text-secondary)] group-hover:text-white">{item}</span><span className="mt-4 block text-[var(--text-tertiary)] transition group-hover:translate-x-1 group-hover:text-[var(--accent)]">→</span></button>)}</div><div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--surface)] p-3 shadow-2xl shadow-black/20"><textarea value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); startAnalysis(); } }} placeholder={prompt} rows={3} aria-label="Investigation prompt" className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 outline-none placeholder:text-[var(--text-tertiary)]" /><div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-dark)] px-2 pt-3"><div className="flex items-center gap-2"><span className="text-[11px] text-[var(--text-secondary)]">Answer for</span><div className="flex rounded-lg bg-white/[.05] p-0.5">{([['executive','Executive'],['analyst','Analyst'],['operator','Operator']] as const).map(([value, label]) => <button key={value} onClick={() => setAudience(value)} className={`rounded-md px-2.5 py-1.5 text-[11px] ${audience === value ? "bg-[var(--accent)] font-medium text-[var(--ink-deep)]" : "text-[var(--text-secondary)]"}`}>{label}</button>)}</div></div><button onClick={() => startAnalysis()} disabled={!query.trim()} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--ink-deep)] transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30">Investigate <ArrowUp size={14} /></button></div></div><div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[var(--text-tertiary)]"><span>Press</span><kbd className="rounded border border-[var(--line-dark)] px-1.5 py-0.5">Enter</kbd><span>to run</span><span className="mx-1">·</span><button onClick={() => setCommandOpen(true)} className="hover:text-[var(--accent)]">⌘K for shortcuts</button></div></section> : <div className="animate-fade-up"><button onClick={resetAnalysis} className="mb-5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]">← New investigation</button><ChatUI initialContext={{ source: "home", label: audience, prompt: `${query}\n\nFrame the answer for a ${audience}.` }} /></div>}
        </main>
      </div>
      {commandOpen && <div className="fixed inset-0 z-50 grid place-items-start bg-black/60 px-4 pt-24" onClick={() => setCommandOpen(false)}><div role="dialog" aria-modal="true" aria-label="Workspace commands" className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--line-dark)] bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center gap-3 border-b border-[var(--line-dark)] px-4 py-3"><Search size={17} className="text-[var(--text-secondary)]" /><input autoFocus placeholder="Search workspace..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]" onKeyDown={(e) => { if (e.key === "Escape") setCommandOpen(false); }} /><kbd className="text-[10px] text-[var(--text-tertiary)]">ESC</kbd></div><div className="p-2"><button onClick={() => { setCommandOpen(false); resetAnalysis(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-white/[.06]"><Sparkles size={16} className="text-[var(--accent)]" />New investigation</button><button onClick={() => { setCommandOpen(false); setActiveNav("Recent"); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-white/[.06]"><History size={16} className="text-[var(--accent)]" />Open recent analyses</button></div></div></div>}
      {(settingsOpen || helpOpen) && <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4" onClick={() => { setSettingsOpen(false); setHelpOpen(false); }}><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-[var(--line-dark)] bg-[var(--surface)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{settingsOpen ? "Workspace settings" : "How CPGist works"}</h2><button aria-label="Close dialog" onClick={() => { setSettingsOpen(false); setHelpOpen(false); }}><X size={18} /></button></div>{settingsOpen ? <div className="mt-5 space-y-4 text-sm text-[var(--text-secondary)]"><p>Audience framing: <strong className="text-white">{audience}</strong></p><p>Data freshness: <strong className="text-[var(--success)]">Healthy</strong></p><button onClick={() => { setSettingsOpen(false); resetAnalysis(); }} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--ink-deep)]">Start fresh workspace</button></div> : <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--text-secondary)]"><p>Choose a workflow or describe a question. CPGist retrieves source-traceable retail data, then returns metrics, insights, and recommended actions.</p><p>Use Frame for in the analyst view to change presentation without changing the underlying facts.</p></div>}</div></div>}
    </div>
  );
}
