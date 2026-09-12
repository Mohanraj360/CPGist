import { getSupabaseServerClient } from "@/lib/supabase";

export interface ForecastArgs {
  brand: string;
  retailer: string;
  promo_depth: number; // % price discount, e.g. 20 for 20% off
  promo_duration: number; // weeks
}

// Phase 5: elasticity model, promo_depth (%) -> lift (%).
//
// Previously this proxied depth from `promo_type` (TPR/Display/Ad/BOGO ->
// a hardcoded band), because the seed data didn't carry a real discount
// figure. Phase 1 added `discount_depth_pct` to sales_facts (and Phase 5
// exposed it, plus `category`, on v_promo_lift), so this now regresses on
// the actual price-cut depth instead of a categorical stand-in.
//
// Fit scope: per CATEGORY (matching the original build brief — "per
// category using scikit-learn or numpy polyfit"), not per brand/retailer —
// a single brand+retailer slice is too thin (a handful of promo weeks) to
// fit anything meaningful, but pooling across all brands/retailers in the
// brand's category gives tens of thousands of points with a real
// discount-depth -> lift relationship (r ~= 0.77-0.79 across all 10
// categories, checked directly against a loaded Postgres instance before
// writing this). Region isn't folded into the fit — the brief only calls
// for category-level elasticity, and category already dilutes region-level
// noise; worth revisiting if region-level elasticity becomes its own ask.
//
// This still fits in TypeScript at request time rather than as a
// precomputed/scheduled job or a Python scikit-learn service, per the
// original "or even numpy polyfit, server-side" allowance in the brief —
// with ~25-30K points per category this is still a cheap O(n) pass, but a
// precomputed-and-cached version would be the first thing to reach for if
// this tool's query volume ever became a concern.

interface Point {
  x: number; // discount depth %
  y: number; // pct lift
}

interface RegressionFit {
  slope: number;
  intercept: number;
  r_squared: number;
  n_points: number;
}

function fitLinearRegression(points: Point[]): RegressionFit {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r_squared: 0, n_points: n };

  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    denX += (p.x - meanX) ** 2;
    denY += (p.y - meanY) ** 2;
  }

  const slope = denX !== 0 ? num / denX : 0;
  const intercept = meanY - slope * meanX;

  // r_squared via the correlation-coefficient identity (r^2), cheaper than
  // recomputing residuals from predictions and equivalent for simple OLS.
  const r = denX !== 0 && denY !== 0 ? num / Math.sqrt(denX * denY) : 0;
  const r_squared = r * r;

  return { slope, intercept, r_squared: Math.round(r_squared * 1000) / 1000, n_points: n };
}

export async function getForecast(args: ForecastArgs) {
  const sb = getSupabaseServerClient();

  // Resolve the brand by name -> {id, category}. `ilike` with no wildcard
  // chars is a case-insensitive exact match; falls back to a substring
  // search if that misses, same tolerance getBrandContext.ts already uses.
  let { data: brandRow, error: brandErr } = await sb
    .from("brands")
    .select("id, name, category")
    .ilike("name", args.brand)
    .limit(1)
    .maybeSingle();
  if (brandErr) throw brandErr;

  if (!brandRow) {
    const fallback = await sb
      .from("brands")
      .select("id, name, category")
      .ilike("name", `%${args.brand}%`)
      .limit(1)
      .maybeSingle();
    if (fallback.error) throw fallback.error;
    brandRow = fallback.data;
  }

  if (!brandRow) {
    return {
      brand: args.brand,
      retailer: args.retailer,
      found: false,
      note: `No brand found matching "${args.brand}".`,
      source_tables: ["brands"],
    };
  }

  // Resolve the retailer by name (substring match — Phase 4's fix for
  // region-suffixed names like "QuickDash (Metro)").
  const { data: retailerRows, error: retailerErr } = await sb
    .from("retailers")
    .select("id, name, region")
    .ilike("name", `%${args.retailer}%`);
  if (retailerErr) throw retailerErr;

  if (!retailerRows || retailerRows.length === 0) {
    return {
      brand: brandRow.name,
      retailer: args.retailer,
      found: false,
      note: `No retailer found matching "${args.retailer}".`,
      source_tables: ["retailers"],
    };
  }
  const retailerIds = retailerRows.map((r) => r.id);

  // Category-level regression points: real discount depth -> real lift,
  // pooled across all brands/retailers in this category.
  const { data: promoRows, error: promoErr } = await sb
    .from("v_promo_lift")
    .select("discount_depth_pct, pct_lift")
    .eq("category", brandRow.category)
    .not("discount_depth_pct", "is", null)
    .not("pct_lift", "is", null);
  if (promoErr) throw promoErr;

  const points: Point[] = (promoRows ?? [])
    .filter((r) => r.discount_depth_pct != null && r.pct_lift != null)
    .map((r) => ({ x: r.discount_depth_pct as number, y: r.pct_lift as number }));

  const fit = fitLinearRegression(points);
  const projectedLiftPct = Math.max(0, fit.slope * args.promo_depth + fit.intercept);

  // Baseline: this brand's average non-promo weekly $ sales at the resolved
  // retailer(s), to apply the projected lift against for a $ estimate.
  const { data: baselineRows, error: baselineErr } = await sb
    .from("sales_facts")
    .select("dollar_sales, products!inner(brand_id)")
    .eq("products.brand_id", brandRow.id)
    .in("retailer_id", retailerIds)
    .eq("on_promo", false);
  if (baselineErr) throw baselineErr;

  const avgWeeklyBaseline = baselineRows && baselineRows.length
    ? baselineRows.reduce((s, r: any) => s + Number(r.dollar_sales), 0) / baselineRows.length
    : 0;

  const estimatedIncrementalDollars = Math.round(
    avgWeeklyBaseline * (projectedLiftPct / 100) * args.promo_duration
  );

  const caveats: string[] = [];
  if (fit.n_points < 30) {
    caveats.push("Low sample size for this category — projection is directional, not precise.");
  }
  if (fit.r_squared < 0.3) {
    caveats.push(`Weak fit (R\u00b2 = ${fit.r_squared}) — discount depth alone doesn't explain much of the lift variation in this category.`);
  }
  if (avgWeeklyBaseline === 0) {
    caveats.push("No non-promo baseline sales found for this brand at this retailer — the $ estimate defaults to 0.");
  }

  return {
    brand: brandRow.name,
    category: brandRow.category,
    retailer: args.retailer,
    matched_retailers: retailerRows.map((r) => `${r.name} (${r.region})`),
    promo_depth_pct: args.promo_depth,
    promo_duration_weeks: args.promo_duration,
    projected_lift_pct: Math.round(projectedLiftPct * 10) / 10,
    estimated_incremental_dollars: estimatedIncrementalDollars,
    regression: fit,
    caveat: caveats.length ? caveats.join(" ") : null,
    found: true,
    source_tables: ["brands", "retailers", "v_promo_lift", "sales_facts"],
  };
}
