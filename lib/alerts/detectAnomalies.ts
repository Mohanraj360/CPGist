import { getSupabaseServiceClient } from "@/lib/supabase-service";
import { getDatasetAsOfDate } from "@/lib/tools/datasetClock";

// Threshold picked from real data, not guessed: checked the distribution
// of non-promo week-over-week unit swings across the whole dataset before
// choosing this (|swing| > 50% flags ~3.4% of non-promo product/retailer
// weeks — a genuinely notable tail, not most of the dataset). Aggregating
// to brand+retailer grain (this module) sums multiple products' noise
// together, which should make real swings clearer against baseline noise,
// not less, so 50% at the aggregate level is if anything more
// conservative than the per-product check it was picked from.
const SWING_THRESHOLD_PCT = 50;

// How far back (from the dataset's own last date, not wall-clock — same
// anchor datasetClock.ts uses everywhere else) to scan for anomalies.
const LOOKBACK_WEEKS = 12;

export interface DetectedAlert {
  brand_id: number;
  retailer_id: number;
  category: string;
  region: string | null;
  alert_type: "velocity_swing_down" | "velocity_swing_up";
  week_ending: string;
  baseline_units: number;
  actual_units: number;
  swing_pct: number;
  narrative: string;
  org_id: number;
}

interface SalesRow {
  product_id: number;
  retailer_id: number;
  week_ending: string;
  units: number;
  on_promo: boolean;
}

// Runs the detector and returns what it found — does NOT write to the DB
// itself, so it's testable/reviewable independent of the write path (the
// cron route calls this, then upserts the result).
export async function detectVelocityAnomalies(): Promise<DetectedAlert[]> {
  const sb = getSupabaseServiceClient();

  const asOf = await getDatasetAsOfDate(sb);
  const lookbackStart = new Date(asOf);
  lookbackStart.setDate(lookbackStart.getDate() - LOOKBACK_WEEKS * 7 - 28); // extra 4wks so the earliest lookback weeks still have a trailing baseline

  const { data: brands, error: brandsErr } = await sb.from("brands").select("id, name, category, org_id");
  if (brandsErr) throw brandsErr;

  const { data: retailers, error: retailersErr } = await sb.from("retailers").select("id, name, region");
  if (retailersErr) throw retailersErr;

  const { data: products, error: productsErr } = await sb.from("products").select("id, brand_id");
  if (productsErr) throw productsErr;

  const brandById = new Map((brands ?? []).map((b) => [b.id, b]));
  const retailerById = new Map((retailers ?? []).map((r) => [r.id, r]));
  const productToBrand = new Map((products ?? []).map((p) => [p.id, p.brand_id]));

  const { data: salesRows, error: salesErr } = await sb
    .from("sales_facts")
    .select("product_id, retailer_id, week_ending, units, on_promo")
    .gte("week_ending", lookbackStart.toISOString().slice(0, 10))
    .returns<SalesRow[]>();
  if (salesErr) throw salesErr;

  // Aggregate to (brand_id, retailer_id, week) — sum units across all of
  // a brand's products at a retailer for that week.
  const agg = new Map<string, { units: number; onPromo: boolean }>();
  for (const row of salesRows ?? []) {
    const brandId = productToBrand.get(row.product_id);
    if (brandId == null) continue;
    const key = `${brandId}:${row.retailer_id}:${row.week_ending}`;
    const cur = agg.get(key) ?? { units: 0, onPromo: false };
    cur.units += Number(row.units);
    cur.onPromo = cur.onPromo || row.on_promo;
    agg.set(key, cur);
  }

  // Per (brand, retailer), ordered by week, so a trailing baseline can be
  // computed the same way v_promo_lift/getForecast do it elsewhere in
  // this codebase — consistency matters here since a different baseline
  // method would make "50%" mean something different in this module than
  // it does anywhere else.
  const byBrandRetailer = new Map<string, { week: string; units: number; onPromo: boolean }[]>();
  for (const [key, val] of agg.entries()) {
    const [brandId, retailerId, week] = key.split(":");
    const groupKey = `${brandId}:${retailerId}`;
    const arr = byBrandRetailer.get(groupKey) ?? [];
    arr.push({ week, units: val.units, onPromo: val.onPromo });
    byBrandRetailer.set(groupKey, arr);
  }

  const lookbackWindowStart = new Date(asOf);
  lookbackWindowStart.setDate(lookbackWindowStart.getDate() - LOOKBACK_WEEKS * 7);
  const lookbackWindowStartStr = lookbackWindowStart.toISOString().slice(0, 10);

  const alerts: DetectedAlert[] = [];

  for (const [groupKey, weeks] of byBrandRetailer.entries()) {
    const [brandIdStr, retailerIdStr] = groupKey.split(":");
    const brandId = Number(brandIdStr);
    const retailerId = Number(retailerIdStr);
    const brand = brandById.get(brandId);
    const retailer = retailerById.get(retailerId);
    if (!brand || !retailer) continue;

    weeks.sort((a, b) => (a.week < b.week ? -1 : 1));

    // Trailing 4-week non-promo baseline, same method used elsewhere.
    const window: number[] = [];
    for (const w of weeks) {
      const trailing = window.length >= 2 ? window.reduce((a, b) => a + b, 0) / window.length : null;

      if (w.week >= lookbackWindowStartStr && !w.onPromo && trailing != null && trailing > 0) {
        const swingPct = ((w.units - trailing) / trailing) * 100;
        if (Math.abs(swingPct) > SWING_THRESHOLD_PCT) {
          const direction = swingPct < 0 ? "velocity_swing_down" : "velocity_swing_up";
          const verb = swingPct < 0 ? "dropped" : "jumped";
          alerts.push({
            brand_id: brandId,
            retailer_id: retailerId,
            category: brand.category,
            region: retailer.region ?? null,
            alert_type: direction,
            week_ending: w.week,
            baseline_units: Math.round(trailing * 10) / 10,
            actual_units: Math.round(w.units * 10) / 10,
            swing_pct: Math.round(swingPct * 10) / 10,
            narrative: `${brand.name} units ${verb} ${Math.abs(Math.round(swingPct))}% at ${retailer.name} the week of ${w.week} vs. its trailing 4-week baseline (${Math.round(w.units)} vs. ~${Math.round(trailing)} units) — not a promo week, worth checking distribution, a competitor move, or an out-of-stock.`,
            org_id: brand.org_id ?? 1,
          });
        }
      }

      if (!w.onPromo) {
        window.push(w.units);
        if (window.length > 4) window.shift();
      }
    }
  }

  return alerts;
}
