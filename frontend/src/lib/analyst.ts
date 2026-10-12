// Hand-written TS mirrors of the Pydantic models in backend/models/analyst.py,
// plus the builder that turns the preview's current selection into the context
// the AI Analyst reasons over. Keeping the model only ever seeing the numbers
// that are on screen is what makes its citations verifiable.

import {
  fmtMoney,
  fmtPct,
  fmtRatio,
  fmtSigned,
  fmtUnits,
  brandSeries,
  retailerTable,
  summarize,
  weeklySeries,
  type PeriodWindow,
} from "./dataset";

export type FindingKind = "observed" | "calculated" | "estimate" | "explanation" | "limitation";

export interface AnalystKpi {
  label: string;
  value: string;
  change?: string | null;
}

export interface AnalystWeekPoint {
  week: string;
  sales: string;
  baseline: string;
}

export interface AnalystBrandRow {
  brand: string;
  sales: string;
  growth: string;
}

export interface AnalystRetailerRow {
  retailer: string;
  sales: string;
  growth: string;
  velocity: string;
  acv: string;
  promo_share: string;
}

export interface AnalystContext {
  period_label: string;
  brand_filter: string;
  retailer_filter: string;
  has_prior_period: boolean;
  kpis: AnalystKpi[];
  weekly: AnalystWeekPoint[];
  brands: AnalystBrandRow[];
  retailers: AnalystRetailerRow[];
}

export interface AnalystFinding {
  kind: FindingKind;
  text: string;
}

export interface AnalystAnswer {
  question: string;
  findings: AnalystFinding[];
  note: string;
  source: "live_ai" | "fallback";
}

/** Build the request context from the preview's current filter selection. */
export function buildAnalystContext(
  scope: PeriodWindow,
  periodLabel: string,
  brandFilter: string,
  retailerFilter: string,
): AnalystContext {
  const summary = summarize(scope);
  return {
    period_label: periodLabel,
    brand_filter: brandFilter === "all" ? "All brands" : brandFilter,
    retailer_filter: retailerFilter === "all" ? "All retailers" : retailerFilter,
    has_prior_period: scope.prior !== null,
    kpis: [
      { label: "Gross sales", value: fmtMoney(summary.sales), change: fmtSigned(summary.salesGrowth) },
      { label: "Units sold", value: fmtUnits(summary.units), change: fmtSigned(summary.unitsGrowth) },
      { label: "% ACV distribution", value: fmtPct(summary.acv), change: fmtSigned(summary.acvGrowth) },
      { label: "Promo lift", value: fmtRatio(summary.promoLift), change: fmtSigned(summary.promoLiftGrowth) },
    ],
    // Cap the series so the prompt stays compact on 52-week selections.
    weekly: weeklySeries(scope)
      .slice(-16)
      .map((w) => ({ week: w.week, sales: fmtMoney(w.sales), baseline: fmtMoney(w.baseline) })),
    brands: brandSeries(scope).map((b) => ({
      brand: b.brand,
      sales: fmtMoney(b.sales),
      growth: fmtSigned(b.growth),
    })),
    retailers: retailerTable(scope).map((r) => ({
      retailer: r.retailer,
      sales: fmtMoney(r.sales),
      growth: fmtSigned(r.growth),
      velocity: `${r.velocity.toFixed(1)} units/store/wk`,
      acv: fmtPct(r.acv),
      promo_share: fmtPct(r.promoShare),
    })),
  };
}
