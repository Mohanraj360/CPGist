import { getSupabaseServerClient } from "@/lib/supabase";

export interface PromoLiftArgs {
  brand?: string;
  retailer?: string;
  date_range?: { start: string; end: string };
}

// Pulls promo-week lift rows from v_promo_lift, optionally filtered by
// brand name (joined via product name prefix — see note below) and retailer.
export async function getPromoLiftAnalysis(args: PromoLiftArgs) {
  const sb = getSupabaseServerClient();

  let query = sb
    .from("v_promo_lift")
    .select("product_id, product_name, retailer_name, channel, week_ending, promo_type, promo_week_units, trailing_nonpromo_baseline_units, pct_lift");

  if (args.retailer) query = query.ilike("retailer_name", `%${args.retailer}%`);
  if (args.date_range) {
    query = query.gte("week_ending", args.date_range.start).lte("week_ending", args.date_range.end);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Brand isn't a column on v_promo_lift (it's product-grain), so filter by
  // product_name prefix when a brand is given — product names are seeded as
  // "<Brand> <Subcategory>".
  const filtered = args.brand
    ? (data ?? []).filter((r) => r.product_name?.startsWith(args.brand!))
    : data ?? [];

  const liftValues = filtered.map((r) => r.pct_lift).filter((v): v is number => v != null);
  const avgLift = liftValues.length ? liftValues.reduce((a, b) => a + b, 0) / liftValues.length : null;

  const byPromoType = new Map<string, number[]>();
  for (const row of filtered) {
    if (row.pct_lift == null || !row.promo_type) continue;
    const arr = byPromoType.get(row.promo_type) ?? [];
    arr.push(row.pct_lift);
    byPromoType.set(row.promo_type, arr);
  }
  const liftByPromoType = Array.from(byPromoType.entries()).map(([type, vals]) => ({
    promo_type: type,
    avg_pct_lift: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
    n_weeks: vals.length,
  }));

  return {
    brand: args.brand ?? "all brands",
    retailer: args.retailer ?? "all retailers",
    date_range: args.date_range ?? "all available weeks",
    avg_pct_lift: avgLift != null ? Math.round(avgLift * 10) / 10 : null,
    lift_by_promo_type: liftByPromoType,
    promo_weeks_analyzed: filtered.length,
    detail_rows: filtered.slice(0, 50), // cap payload sent back to the LLM
    source_tables: ["v_promo_lift"],
  };
}
