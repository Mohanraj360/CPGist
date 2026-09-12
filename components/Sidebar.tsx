"use client";

const TEMPLATES = [
  { label: "Brand Ranking", group: "Analyze", prompt: "Rank brands in Salty Snacks by dollar sales over the last 12 weeks." },
  { label: "Promo Lift Analysis", group: "Analyze", prompt: "What's the average promo lift for Bold Snacks across Quick Commerce retailers?" },
  { label: "Channel Mix Shift", group: "Discover", prompt: "Show me True Water Co's sales mix — Quick Commerce vs Modern Trade." },
  { label: "Distribution Whitespace", group: "Discover", prompt: "Where does Urban Crisps have distribution gaps in Gulf - Qatar vs the Salty Snacks category average?" },
  { label: "Promo Scenario / What-If", group: "Create", prompt: "If I run a 20% discount for 4 weeks on Bold Snacks at QuickDash, what's the projected lift and cannibalization risk?" },
  { label: "Competitive Context", group: "Discover", prompt: "What's the competitive and portfolio context for Coastal Little Ones right now?" },
  { label: "Competitor Activity", group: "Discover", prompt: "Has anyone in Bold Snacks' competitive set launched a promo recently?" },
];

export { TEMPLATES };

export default function Sidebar({ onSelectTemplate }: { onSelectTemplate: (prompt: string) => void }) {
  return (
    <aside className="hidden w-[224px] shrink-0 border-r border-[var(--line)] bg-white p-4 xl:block">
      <button type="button" onClick={() => onSelectTemplate("")} className="mb-6 flex w-full items-center justify-between rounded-lg bg-[var(--navy)] px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"><span>New analysis</span><span className="text-lg leading-none">+</span></button>
      <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Verified workflows</p>
      <div className="flex flex-col gap-1">
        {TEMPLATES.map((template) => (
          <button key={template.label} type="button" onClick={() => onSelectTemplate(template.prompt)} className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-[var(--muted)] transition-colors hover:bg-[var(--canvas)] hover:text-[var(--ink)]"><span className="truncate">{template.label}</span><span className="ml-2 text-[10px] text-[var(--line-strong)] transition-colors group-hover:text-[var(--mint-strong)]">→</span></button>
        ))}
      </div>
    </aside>
  );
}
