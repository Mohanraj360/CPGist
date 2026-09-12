"use client";

// Seven workflow templates, one per available agent tool — including the
// forecast/what-if simulator, cross-brand context, and competitive-signals
// tools added in earlier phases, which previously had no entry point in the
// UI at all. Every brand/retailer/region name here is verified against the
// actual dataset (see PHASE4_NOTES.md / PHASE7_NOTES.md), not placeholder
// text.
const TEMPLATES = [
  { label: "Brand Ranking", prompt: "Rank brands in Salty Snacks by dollar sales over the last 12 weeks." },
  { label: "Promo Lift Analysis", prompt: "What's the average promo lift for Bold Snacks across Quick Commerce retailers?" },
  { label: "Channel Mix Shift", prompt: "Show me True Water Co's sales mix — Quick Commerce vs Modern Trade." },
  { label: "Distribution Whitespace", prompt: "Where does Urban Crisps have distribution gaps in Gulf - Qatar vs the Salty Snacks category average?" },
  { label: "Promo Scenario / What-If", prompt: "If I run a 20% discount for 4 weeks on Bold Snacks at QuickDash, what's the projected lift and cannibalization risk?" },
  { label: "Competitive Context", prompt: "What's the competitive and portfolio context for Coastal Little Ones right now?" },
  { label: "Competitor Activity", prompt: "Has anyone in Bold Snacks' competitive set launched a promo recently?" },
];

export default function Sidebar({ onSelectTemplate }: { onSelectTemplate: (prompt: string) => void }) {
  return (
    <aside className="w-64 shrink-0 border-r border-white/10 p-4 hidden md:block">
      <div className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">Quick Start</div>
      <div className="flex flex-col gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            onClick={() => onSelectTemplate(t.prompt)}
            className="text-left text-sm px-3 py-2 rounded-lg bg-panel hover:bg-white/10 transition-colors"
          >
            {t.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
