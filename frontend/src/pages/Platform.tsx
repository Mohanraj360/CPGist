import { Link } from "react-router-dom";
import { Bar, BarChart, Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "@/lib/recharts";
import { buttonVariants } from "@/components/ui/button";
import { CTARow, EvidencePill, Eyebrow, MockWindow, Reveal, SectionHeader } from "@/components/site/Sections";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brandSeries, fmtMoney, fmtPct, fmtSigned, fmtUnits, periodWindow, retailerTable, summarize, weeklySeries } from "@/lib/dataset";
import { usePageMeta } from "@/lib/seo";

// The mockups reuse the same synthetic dataset as the homepage preview (default
// 12-week view), so figures shown across the site agree.
const DEFAULT_SCOPE = periodWindow("l12w", "all", "all");
const DEFAULT_SUMMARY = summarize(DEFAULT_SCOPE);
const DEFAULT_WEEKLY = weeklySeries(DEFAULT_SCOPE);
const DEFAULT_BRANDS = brandSeries(DEFAULT_SCOPE);
const DEFAULT_RETAILERS = retailerTable(DEFAULT_SCOPE);

function PlatformSection({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24 py-12 first:pt-0 last:pb-0">
      <h2 id={`${id}-heading`} className="text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">{intro}</p>
      {children}
    </section>
  );
}

const SECTION_LINKS = [
  { id: "executive-dashboard", label: "Executive Dashboard" },
  { id: "data-explorer", label: "Data Explorer" },
  { id: "brand-product", label: "Brand & Product Intelligence" },
  { id: "retail-distribution", label: "Retail & Distribution Intelligence" },
  { id: "pricing-promotion", label: "Pricing & Promotion Analytics" },
  { id: "ai-analyst", label: "AI Analyst" },
  { id: "reports", label: "Reports" },
];

const EVIDENCE_EXAMPLES: { kind: "observed" | "calculated" | "estimate" | "explanation" | "limitation"; text: string }[] = [
  { kind: "observed", text: "“Gross sales in the selected period totalled $5.1M across 1.19M units.”" },
  { kind: "calculated", text: "“Target's per-store velocity is 33% above Kroger's over the same period.”" },
  { kind: "estimate", text: "“If the current trajectory holds, Q4 sales land near $5.4M — a projection, not a fact.”" },
  { kind: "explanation", text: "“A plausible driver is the feature-and-display event in week 7 — a hypothesis to verify.”" },
  { kind: "limitation", text: "“The dataset has no out-of-stock rates, so availability effects can't be confirmed.”" },
];

export default function Platform() {
  usePageMeta({
    title: "Platform | CPGist",
    description:
      "Explore the CPGist platform: executive dashboards, data explorer, brand and product analytics, retail and distribution intelligence, pricing and promotion analytics, an evidence-aware AI Analyst, and executive reporting.",
    path: "/platform",
  });

  return (
    <>
      <section className="bg-page">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <Eyebrow>Platform</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-balance text-navy-950 sm:text-4xl lg:text-5xl">
            One workspace. Multiple perspectives on growth.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            CPGist connects the metrics CPG teams rely on — sales, brands, products, retailers,
            distribution, pricing, and promotions — and adds AI-assisted investigation that shows
            its evidence.
          </p>
          <CTARow
            className="mt-8"
            primary={{ label: "Request a Demo", to: "/contact", testid: "platform-cta-request-demo" }}
            secondary={{ label: "Explore Solutions", to: "/solutions", testid: "platform-cta-explore-solutions" }}
          />
          <nav aria-label="Platform sections" className="mt-10 flex flex-wrap gap-2">
            {SECTION_LINKS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-navy-600 hover:text-navy-800"
                data-testid={`platform-anchor-${s.id}`}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="bg-page pb-16 sm:pb-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Executive Dashboard */}
          <PlatformSection
            id="executive-dashboard"
            title="Executive Dashboard"
            intro="A consolidated view of supported business KPIs, sales trends, growth indicators, and performance changes — the first screen leaders open each week."
          >
            <Reveal className="mt-6">
              <MockWindow title="Executive Dashboard — sample data">
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs font-medium text-slate-500">Gross sales (L12W)</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-navy-950">{fmtMoney(DEFAULT_SUMMARY.sales)}</p>
                      <p className="mt-1 text-xs font-medium tabular-nums text-emerald-600">{fmtSigned(DEFAULT_SUMMARY.salesGrowth)} vs prior 12 weeks</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs font-medium text-slate-500">Units sold</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-navy-950">{fmtUnits(DEFAULT_SUMMARY.units)}</p>
                      <p className="mt-1 text-xs font-medium tabular-nums text-emerald-600">{fmtSigned(DEFAULT_SUMMARY.unitsGrowth)} vs prior 12 weeks</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs font-medium text-slate-500">% ACV distribution</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-navy-950">{fmtPct(DEFAULT_SUMMARY.acv)}</p>
                      <p className="mt-1 text-xs font-medium tabular-nums text-emerald-600">{fmtSigned(DEFAULT_SUMMARY.acvGrowth)} pts vs prior</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs font-medium text-slate-500">Promo lift</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-navy-950">{DEFAULT_SUMMARY.promoLift.toFixed(2)}×</p>
                      <p className="mt-1 text-xs font-medium tabular-nums text-slate-400">No prior-period data in sample</p>
                    </div>
                  </div>
                  <div className="mt-4 h-48" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={DEFAULT_WEEKLY} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#667085" }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} minTickGap={28} />
                        <YAxis tickFormatter={(v: number) => fmtMoney(v)} tick={{ fontSize: 11, fill: "#667085" }} tickLine={false} axisLine={false} width={58} />
                        <Tooltip formatter={(value: number) => fmtMoney(value)} />
                        <Area type="monotone" dataKey="sales" name="Gross sales" stroke="#1E2761" strokeWidth={2} fill="#1E2761" fillOpacity={0.08} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Sample mockup — illustrative data only.</p>
                </div>
              </MockWindow>
            </Reveal>
          </PlatformSection>

          {/* Data Explorer */}
          <PlatformSection
            id="data-explorer"
            title="Data Explorer"
            intro="Investigate brands, products, retailers, regions, categories, and supported metrics with relevant filters. Metrics that your data doesn't support are shown as unavailable rather than guessed."
          >
            <Reveal className="mt-6">
              <MockWindow title="Data Explorer — sample view">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-wrap gap-2" aria-hidden="true">
                    {["Period: Last 12 weeks", "Brand: OatCraft Beverages", "Retailer: All", "Metric: Gross sales"].map((chip) => (
                      <span key={chip} className="rounded-full bg-ice-100 px-3 py-1 text-xs font-medium text-navy-800">
                        {chip}
                      </span>
                    ))}
                  </div>
                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow className="bg-slate-50/80">
                        <TableHead className="text-xs">Retailer</TableHead>
                        <TableHead className="text-xs">Gross sales</TableHead>
                        <TableHead className="text-xs">Sales growth</TableHead>
                        <TableHead className="text-xs">Promo share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {DEFAULT_RETAILERS.slice(0, 3).map((r) => (
                        <TableRow key={r.retailer}>
                          <TableCell className="text-sm font-medium text-navy-950">{r.retailer}</TableCell>
                          <TableCell className="text-sm tabular-nums text-slate-700">{fmtMoney(r.sales)}</TableCell>
                          <TableCell className="text-sm tabular-nums text-emerald-600">{fmtSigned(r.growth)}</TableCell>
                          <TableCell className="text-sm tabular-nums text-slate-700">{fmtPct(r.promoShare)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="mt-3 text-xs text-slate-500">Sample mockup — illustrative data only.</p>
                </div>
              </MockWindow>
            </Reveal>
          </PlatformSection>

          {/* Brand & Product Intelligence */}
          <PlatformSection
            id="brand-product"
            title="Brand and Product Intelligence"
            intro="Compare available performance metrics across brands and SKUs, and investigate potential drivers of change — distribution shifts, pricing moves, promotion intensity, or seasonality."
          >
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Reveal>
                <MockWindow title="Brand comparison — sample view">
                  <div className="p-4 sm:p-6">
                    <div className="h-48" aria-hidden="true">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={DEFAULT_BRANDS.map((b) => ({ ...b, short: b.brand.split(" ")[0] }))} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                          <XAxis dataKey="short" tick={{ fontSize: 11, fill: "#667085" }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} interval={0} />
                          <YAxis tickFormatter={(v: number) => fmtMoney(v)} tick={{ fontSize: 11, fill: "#667085" }} tickLine={false} axisLine={false} width={58} />
                          <Tooltip formatter={(value: number) => fmtMoney(value)} />
                          <Bar dataKey="sales" name="Gross sales" fill="#26307A" radius={[6, 6, 0, 0]} maxBarSize={44} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Sample mockup — illustrative data only.</p>
                  </div>
                </MockWindow>
              </Reveal>
              <Reveal delay={0.05}>
                <ul className="space-y-3">
                  {[
                    "Side-by-side brand and SKU comparisons over consistent periods.",
                    "Change decomposition hints: distribution, pricing, promotion, seasonality — where the data supports each.",
                    "Drill from portfolio to brand to product without losing the filter context.",
                    "Anomaly flags surface where metrics move beyond their usual range.",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600">
                      <span aria-hidden="true" className="mt-0.5 text-navy-700">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </PlatformSection>

          {/* Retail & Distribution */}
          <PlatformSection
            id="retail-distribution"
            title="Retail and Distribution Intelligence"
            intro="Compare retailers on sales, growth, per-store velocity, distribution, and promotion share. Where the data allows, spot potential availability gaps before they compound."
          >
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800" role="note">
              <strong className="font-semibold">Some metrics need more data.</strong> Store-level
              availability, out-of-stock rates, and void analysis require item-store or supply data.
              When a metric isn't supported by the connected data, CPGist says so instead of
              estimating silently.
            </div>
            <Reveal className="mt-6">
              <MockWindow title="Retailer performance — sample view">
                <div className="p-4 sm:p-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80">
                        <TableHead className="text-xs">Retailer</TableHead>
                        <TableHead className="text-xs">Gross sales</TableHead>
                        <TableHead className="text-xs">Units / store / wk</TableHead>
                        <TableHead className="text-xs">% ACV</TableHead>
                        <TableHead className="text-xs">Promo share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {DEFAULT_RETAILERS.map((r) => (
                        <TableRow key={r.retailer}>
                          <TableCell className="text-sm font-medium text-navy-950">{r.retailer}</TableCell>
                          <TableCell className="text-sm tabular-nums text-slate-700">{fmtMoney(r.sales)}</TableCell>
                          <TableCell className="text-sm tabular-nums text-slate-700">{r.velocity.toFixed(1)}</TableCell>
                          <TableCell className="text-sm tabular-nums text-slate-700">{fmtPct(r.acv)}</TableCell>
                          <TableCell className="text-sm tabular-nums text-slate-700">{fmtPct(r.promoShare)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="mt-3 text-xs text-slate-500">Sample mockup — illustrative data only.</p>
                </div>
              </MockWindow>
            </Reveal>
          </PlatformSection>

          {/* Pricing & Promotion */}
          <PlatformSection
            id="pricing-promotion"
            title="Pricing and Promotion Analytics"
            intro="Analyze pricing trends, promotion performance, baseline comparisons, and supported trade-spend metrics — so trade investment can be evaluated against an honest baseline."
          >
            <Reveal className="mt-6">
              <MockWindow title="Promotion baseline comparison — sample view">
                <div className="p-4 sm:p-6">
                  <div className="space-y-3" aria-hidden="true">
                    {DEFAULT_WEEKLY.slice(2, 9).map((w) => {
                      const baselinePct = (w.baseline / w.sales) * 100;
                      return (
                        <div key={w.week} className="flex items-center gap-3">
                          <span className="w-8 shrink-0 text-xs tabular-nums text-slate-500">{w.week}</span>
                          <div className="h-6 flex-1 overflow-hidden rounded-md bg-ice-100">
                            <div className="flex h-full">
                              <div className="h-full bg-navy-800" style={{ width: `${baselinePct}%` }} />
                              <div className="h-full bg-ember-500/80" style={{ width: `${100 - baselinePct}%` }} />
                            </div>
                          </div>
                          <span className="w-16 shrink-0 text-right text-xs tabular-nums text-slate-600">{fmtMoney(w.sales)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="inline-block size-3 rounded-sm bg-navy-800" /> Non-promo baseline
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="inline-block size-3 rounded-sm bg-ember-500/80" /> Incremental promo sales
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Sample mockup — illustrative data only.</p>
                </div>
              </MockWindow>
            </Reveal>
          </PlatformSection>

          {/* AI Analyst */}
          <PlatformSection
            id="ai-analyst"
            title="AI Analyst"
            intro="Ask questions in natural language and receive structured responses grounded in the data connected to your workspace. Every response separates what is known from what is assumed."
          >
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <ul className="space-y-3">
                {EVIDENCE_EXAMPLES.map((e) => (
                  <li key={e.kind} className="rounded-lg border border-slate-200 bg-white p-4">
                    <EvidencePill kind={e.kind} />
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{e.text}</p>
                  </li>
                ))}
              </ul>
              <Reveal delay={0.05}>
                <div className="h-full rounded-xl bg-navy-950 p-6 text-white">
                  <p className="text-sm font-semibold text-ice-300">Example exchange (sample preview)</p>
                  <p className="mt-4 text-sm">
                    <span className="font-semibold text-ice-300">Q:</span> Why did units drop in the
                    latest week while sales held?
                  </p>
                  <div className="mt-3 space-y-2.5">
                    <EvidencePill kind="observed" />
                    <p className="text-sm text-ice-300">Week 8: sales +3.1%, units −0.4% vs week 7.</p>
                    <EvidencePill kind="calculated" />
                    <p className="text-sm text-ice-300">Average realised price rose ~3.5% week-over-week.</p>
                    <EvidencePill kind="limitation" />
                    <p className="text-sm text-ice-300">No shipment or inventory data in sample — can't confirm stock position.</p>
                  </div>
                  <p className="mt-4 text-xs text-ice-300/70">
                    Sample content for illustration — not a live AI service.
                  </p>
                </div>
              </Reveal>
            </div>
          </PlatformSection>

          {/* Reports */}
          <PlatformSection
            id="reports"
            title="Reports"
            intro="Assemble structured business reviews, executive summaries, performance comparisons, and analytical findings into reports your leadership and clients can act on."
          >
            <Reveal className="mt-6">
              <MockWindow title="Report builder — sample outline">
                <div className="p-4 sm:p-6">
                  <ol className="space-y-2 text-sm text-slate-600">
                    {[
                      "Executive summary — key movements and open questions",
                      "Performance overview — KPIs vs prior period and plan (where provided)",
                      "Brand and product comparisons — what changed and where",
                      "Retail and distribution review — velocity and availability signals",
                      "Pricing and promotion review — baseline vs incremental performance",
                      "Evidence and limitations — what the data does and doesn't support",
                      "Suggested next investigations",
                    ].map((item, i) => (
                      <li key={item} className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-2.5">
                        <span aria-hidden="true" className="text-xs font-bold tabular-nums text-navy-600">{String(i + 1).padStart(2, "0")}</span>
                        {item}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-xs text-slate-500">Sample mockup — illustrative structure only.</p>
                </div>
              </MockWindow>
            </Reveal>
          </PlatformSection>
        </div>
      </div>

      {/* Final CTA */}
      <section className="bg-navy-950 py-16 sm:py-20" aria-labelledby="platform-final-cta-heading">
        <div className="mx-auto w-full max-w-4xl px-4 text-center sm:px-6">
          <h2 id="platform-final-cta-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            See these modules on your own data.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ice-300 sm:text-lg">
            Request a demo and we'll walk through the workspace using sample data or a dataset you
            can share.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/contact"
              className={buttonVariants({ size: "lg", className: "bg-white text-navy-950 hover:bg-ice-100" })}
              data-testid="platform-final-cta-request-demo"
            >
              Request a Demo
            </Link>
            <Link
              to="/how-it-works"
              className={buttonVariants({ variant: "outline", size: "lg", className: "border-ice-300/40 bg-transparent text-white hover:bg-white/10 hover:text-white" })}
              data-testid="platform-final-cta-how-it-works"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
