// ---------------------------------------------------------------------------
// Synthetic sample dataset + computations for the interactive product preview.
// Every number the preview shows — KPI cards, both charts, the retailer table
// and the AI Analyst sample responses — is computed from this one dataset, so
// the figures agree everywhere. Data is deterministic (seeded PRNG) and
// clearly labelled as illustrative sample data in the UI.
// ---------------------------------------------------------------------------

export const TOTAL_WEEKS = 52;

export const BRANDS = ["OatCraft Beverages", "VitalRoots Snacks", "PureBloom Wellness", "SunPeak Organic"] as const;
export type Brand = (typeof BRANDS)[number];

export const RETAILERS = ["Target", "Whole Foods", "Kroger", "Walmart", "Sprouts"] as const;
export type Retailer = (typeof RETAILERS)[number];

export const TIME_PERIODS = [
  { id: "l4w", label: "Last 4 weeks", weeks: 4 },
  { id: "l12w", label: "Last 12 weeks", weeks: 12 },
  { id: "ytd", label: "Year to date", weeks: 26 },
  { id: "l52w", label: "Last 52 weeks", weeks: 52 },
] as const;
export type TimePeriodId = (typeof TIME_PERIODS)[number]["id"];

export interface PreviewRow {
  week: number; // 1..52, synthetic weeks (oldest → newest)
  brand: Brand;
  retailer: Retailer;
  sales: number; // gross dollar sales for the week (incl. promo)
  baselineSales: number; // estimated non-promo baseline
  promoSales: number; // incremental promo sales
  units: number;
  stores: number; // stores selling that week
  acv: number; // % ACV distribution, brand × retailer
}

const RETAILER_PROFILES: Record<Retailer, { stores: number; baseWeekly: number; growth: number }> = {
  Target: { stores: 460, baseWeekly: 26500, growth: 0.0035 },
  "Whole Foods": { stores: 180, baseWeekly: 31500, growth: 0.0022 },
  Kroger: { stores: 520, baseWeekly: 16800, growth: 0.0016 },
  Walmart: { stores: 640, baseWeekly: 12300, growth: 0.0042 },
  Sprouts: { stores: 96, baseWeekly: 14800, growth: 0.0028 },
};

const BRAND_PROFILES: Record<Brand, { weight: number; price: number; acvMod: number; acvGrowth: number }> = {
  "OatCraft Beverages": { weight: 1.16, price: 4.6, acvMod: 1.1, acvGrowth: 0.004 },
  "VitalRoots Snacks": { weight: 1.0, price: 3.4, acvMod: 1.0, acvGrowth: 0.0025 },
  "PureBloom Wellness": { weight: 0.82, price: 5.4, acvMod: 0.92, acvGrowth: 0.001 },
  "SunPeak Organic": { weight: 0.64, price: 3.9, acvMod: 0.86, acvGrowth: 0.0018 },
};

const RETAILER_ACV: Record<Retailer, number> = {
  Target: 74,
  "Whole Foods": 84,
  Kroger: 62,
  Walmart: 55,
  Sprouts: 70,
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildRows(): PreviewRow[] {
  const rng = mulberry32(20260211);
  const rows: PreviewRow[] = [];
  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    for (const brand of BRANDS) {
      for (const retailer of RETAILERS) {
        const rProfile = RETAILER_PROFILES[retailer];
        const bProfile = BRAND_PROFILES[brand];
        const trend = Math.pow(1 + rProfile.growth, week);
        const seasonal = 1 + 0.05 * Math.sin((week / TOTAL_WEEKS) * Math.PI * 2 - Math.PI / 2);
        const noise = 0.86 + rng() * 0.28;
        const promoOn = rng() < 0.16;
        const promoShare = promoOn ? 0.28 + rng() * 0.3 : 0.03 + rng() * 0.04;
        const sales = rProfile.baseWeekly * bProfile.weight * trend * seasonal * noise * (1 + promoShare);
        const baselineSales = sales / (1 + promoShare);
        const acv = Math.min(98, Math.max(2, RETAILER_ACV[retailer] * bProfile.acvMod * (1 + bProfile.acvGrowth * week)));
        rows.push({
          week,
          brand,
          retailer,
          sales,
          baselineSales,
          promoSales: sales - baselineSales,
          units: sales / bProfile.price,
          stores: Math.round((rProfile.stores * acv) / 100 * (0.92 + rng() * 0.08)),
          acv,
        });
      }
    }
  }
  return rows;
}

const ROWS: PreviewRow[] = buildRows();

// ---------------------------------------------------------------------------
// Filtering + aggregation
// ---------------------------------------------------------------------------

export type BrandFilter = Brand | "all";
export type RetailerFilter = Retailer | "all";

export interface PeriodWindow {
  current: PreviewRow[];
  prior: PreviewRow[] | null; // null when the sample has no earlier weeks
  weeks: number;
}

export function periodWindow(period: TimePeriodId, brand: BrandFilter, retailer: RetailerFilter): PeriodWindow {
  const weeks = TIME_PERIODS.find((p) => p.id === period)?.weeks ?? 12;
  const inScope = (row: PreviewRow) =>
    (brand === "all" || row.brand === brand) && (retailer === "all" || row.retailer === retailer);
  const current = ROWS.filter((r) => r.week > TOTAL_WEEKS - weeks && inScope(r));
  const prior =
    weeks >= TOTAL_WEEKS
      ? null
      : ROWS.filter((r) => r.week > TOTAL_WEEKS - 2 * weeks && r.week <= TOTAL_WEEKS - weeks && inScope(r));
  return { current, prior, weeks };
}

export interface RawMetrics {
  sales: number;
  units: number;
  acv: number; // % ACV weighted by units
  promoLift: number; // gross sales ÷ baseline sales
}

function rawMetrics(rows: PreviewRow[]): RawMetrics {
  const sales = rows.reduce((acc, r) => acc + r.sales, 0);
  const units = rows.reduce((acc, r) => acc + r.units, 0);
  const baseline = rows.reduce((acc, r) => acc + r.baselineSales, 0);
  const acv = units > 0 ? (rows.reduce((acc, r) => acc + r.acv * r.units, 0) / units) : 0;
  const promoLift = baseline > 0 ? sales / baseline : 1;
  return { sales, units, acv, promoLift };
}

function growth(current: number, prior: number | null | undefined): number | null {
  if (prior === null || prior === undefined || prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

export interface Summary extends RawMetrics {
  salesGrowth: number | null;
  unitsGrowth: number | null;
  acvGrowth: number | null;
  promoLiftGrowth: number | null;
}

export function summarize(window: PeriodWindow): Summary {
  const cur = rawMetrics(window.current);
  const prior = window.prior ? rawMetrics(window.prior) : null;
  return {
    ...cur,
    salesGrowth: growth(cur.sales, prior?.sales),
    unitsGrowth: growth(cur.units, prior?.units),
    acvGrowth: growth(cur.acv, prior?.acv),
    promoLiftGrowth: growth(cur.promoLift, prior?.promoLift),
  };
}

export interface WeeklyPoint {
  week: string;
  sales: number;
  baseline: number;
  units: number;
}

export function weeklySeries(window: PeriodWindow): WeeklyPoint[] {
  const byWeek = new Map<number, WeeklyPoint>();
  for (const row of window.current) {
    const existing = byWeek.get(row.week);
    if (existing) {
      existing.sales += row.sales;
      existing.baseline += row.baselineSales;
      existing.units += row.units;
    } else {
      byWeek.set(row.week, { week: `W${row.week}`, sales: row.sales, baseline: row.baselineSales, units: row.units });
    }
  }
  return [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
}

export interface BrandPoint {
  brand: Brand;
  sales: number;
  growth: number | null;
}

export function brandSeries(window: PeriodWindow): BrandPoint[] {
  const curByBrand = new Map<Brand, number>();
  for (const row of window.current) {
    curByBrand.set(row.brand, (curByBrand.get(row.brand) ?? 0) + row.sales);
  }
  const priorByBrand = new Map<Brand, number>();
  if (window.prior) {
    for (const row of window.prior) {
      priorByBrand.set(row.brand, (priorByBrand.get(row.brand) ?? 0) + row.sales);
    }
  }
  return BRANDS.map((brand) => ({
    brand,
    sales: curByBrand.get(brand) ?? 0,
    growth: growth(curByBrand.get(brand) ?? 0, window.prior ? (priorByBrand.get(brand) ?? 0) : null),
  }));
}

export interface RetailerRow {
  retailer: Retailer;
  sales: number;
  growth: number | null;
  velocity: number; // units per store per week
  acv: number; // % ACV weighted by units
  promoShare: number; // promo sales as % of gross sales
}

export function retailerTable(window: PeriodWindow): RetailerRow[] {
  const weeks = new Set(window.current.map((r) => r.week)).size || 1;
  const priorByRetailer = new Map<Retailer, number>();
  if (window.prior) {
    for (const row of window.prior) {
      priorByRetailer.set(row.retailer, (priorByRetailer.get(row.retailer) ?? 0) + row.sales);
    }
  }
  const byRetailer = new Map<Retailer, PreviewRow[]>();
  for (const row of window.current) {
    const list = byRetailer.get(row.retailer) ?? [];
    list.push(row);
    byRetailer.set(row.retailer, list);
  }
  const out: RetailerRow[] = [];
  for (const [retailer, rows] of byRetailer) {
    const sales = rows.reduce((acc, r) => acc + r.sales, 0);
    const units = rows.reduce((acc, r) => acc + r.units, 0);
    const promo = rows.reduce((acc, r) => acc + r.promoSales, 0);
    out.push({
      retailer,
      sales,
      growth: growth(sales, window.prior ? (priorByRetailer.get(retailer) ?? 0) : null),
      velocity: units / (RETAILER_PROFILES[retailer].stores * weeks),
      acv: units > 0 ? rows.reduce((acc, r) => acc + r.acv * r.units, 0) / units : 0,
      promoShare: sales > 0 ? (promo / sales) * 100 : 0,
    });
  }
  return out.sort((a, b) => b.sales - a.sales);
}

// ---------------------------------------------------------------------------
// AI Analyst sample responses — computed from the current selection so the
// numbers agree with the charts. Clearly labelled as a preview, not live AI.
// ---------------------------------------------------------------------------

export interface AiFinding {
  kind: "observed" | "calculated" | "explanation" | "limitation";
  text: string;
}

export interface AiAnswer {
  question: string;
  findings: AiFinding[];
  note: string;
}

const AI_NOTE = "Precomputed sample response from the synthetic preview dataset. Ask your own question for a live AI analysis.";

export const SAMPLE_QUESTIONS = [
  "What's driving the per-store velocity gap between the top two retailers?",
  "Are price increases eroding unit volume in the current selection?",
] as const;

export function sampleVelocityAnswer(window: PeriodWindow): AiAnswer {
  const table = retailerTable(window);
  if (table.length < 2) {
    const top = table[0];
    return {
      question: SAMPLE_QUESTIONS[0],
      findings: [
        {
          kind: "observed",
          text: top
            ? `${top.retailer} is the only retailer in scope under the current filter, running at ${top.velocity.toFixed(1)} units per store per week.`
            : "No rows match the current filter combination.",
        },
        {
          kind: "limitation",
          text: "Only one retailer is in scope — set Retailer to “All retailers” to compare per-store velocity across retailers.",
        },
      ],
      note: AI_NOTE,
    };
  }
  const sorted = [...table].sort((a, b) => b.velocity - a.velocity);
  const [a, b] = sorted;
  const gap = (a.velocity / b.velocity - 1) * 100;
  return {
    question: SAMPLE_QUESTIONS[0],
    findings: [
      {
        kind: "observed",
        text: `${a.retailer} is running at ${a.velocity.toFixed(1)} units per store per week in this selection; ${b.retailer} is at ${b.velocity.toFixed(1)}.`,
      },
      {
        kind: "calculated",
        text: `${a.retailer}'s per-store velocity is ${gap.toFixed(0)}% above ${b.retailer}'s over the selected period.`,
      },
      {
        kind: "explanation",
        text: "A plausible driver is promotional intensity or merchandising placement — heavier feature and display activity typically lifts per-store velocity. Treat this as a hypothesis to verify, not a proven cause.",
      },
      {
        kind: "limitation",
        text: "The sample dataset has no out-of-stock rates, regional price zones, or digital coupon redemptions, any of which could also explain the gap.",
      },
    ],
    note: AI_NOTE,
  };
}

export function samplePriceVolumeAnswer(window: PeriodWindow): AiAnswer {
  const summary = summarize(window);
  if (window.prior === null) {
    return {
      question: SAMPLE_QUESTIONS[1],
      findings: [
        {
          kind: "observed",
          text: `Over the selected window, gross sales totalled ${fmtMoney(summary.sales)} across ${fmtUnits(summary.units)} units.`,
        },
        {
          kind: "limitation",
          text: "The 52-week window has no earlier period in this sample, so a growth comparison can't be calculated. Pick a shorter period to see prior-period changes.",
        },
      ],
      note: AI_NOTE,
    };
  }
  const spread = (summary.salesGrowth ?? 0) - (summary.unitsGrowth ?? 0);
  return {
    question: SAMPLE_QUESTIONS[1],
    findings: [
      {
        kind: "observed",
        text: `Dollar sales moved ${fmtSigned(summary.salesGrowth)} while units moved ${fmtSigned(summary.unitsGrowth)} versus the prior period.`,
      },
      {
        kind: "calculated",
        text: `Dollar growth outpaced unit growth by roughly ${Math.abs(spread).toFixed(1)} points, consistent with price or mix contributing the difference — a rough calculation, not an elasticity estimate.`,
      },
      {
        kind: "explanation",
        text: "A plausible read: pricing was absorbed in these channels without a proportional volume loss, but the sample can't confirm demand elasticity.",
      },
      {
        kind: "limitation",
        text: "No competitor pricing, promotion calendars, or household data are present in the sample, so causality can't be verified here.",
      },
    ],
    note: AI_NOTE,
  };
}

export function customQuestionAnswer(question: string): AiAnswer {  return {
    question,
    findings: [
      {
        kind: "limitation",
        text: `This preview includes two sample investigations only. In the product, AI Analyst answers questions like “${question}” in natural language, grounded in the data connected to your workspace, and distinguishes verified metrics from estimates and missing evidence.`,
      },
    ],
    note: AI_NOTE,
  };
}

// ---------------------------------------------------------------------------
// Number formatting — consistent everywhere on the site.
// ---------------------------------------------------------------------------

export function fmtMoney(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function fmtUnits(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

export function fmtPct(v: number, digits = 1): string {
  return `${v.toFixed(digits)}%`;
}

export function fmtSigned(v: number | null, suffix = "%"): string {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}${suffix}`;
}

export function fmtRatio(v: number): string {
  return `${v.toFixed(2)}×`;
}
