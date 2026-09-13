import { getSupabaseServerClient } from "@/lib/supabase";
import { getDatasetAsOfDate } from "@/lib/tools/datasetClock";

export interface CompetitiveSignalsArgs {
  brand: string;
  lookback_weeks?: number; // default 8
}

// Resolves the queried brand's competitors via brand_relationships
// (relationship_type='competitor' — Phase 2), then pulls competitor_signals
// (Phase 7) for those brands within the lookback window. Two-step lookup
// because competitor_signals stores brand_id = whoever took the action, not
// a second "who should care" FK — brand_relationships already owns that edge
// (see schema.sql's Phase 7 comment for why this wasn't denormalized).
export async function getCompetitiveSignals(args: CompetitiveSignalsArgs) {
  const sb = await getSupabaseServerClient();

  const { data: brandRow, error: brandErr } = await sb
    .from("brands")
    .select("id, name, category")
    .ilike("name", args.brand)
    .limit(1)
    .maybeSingle();
  if (brandErr) throw brandErr;

  if (!brandRow) {
    return {
      brand: args.brand,
      found: false,
      note: `No brand found matching "${args.brand}".`,
      source_tables: ["brands"],
    };
  }

  const { data: edges, error: edgeErr } = await sb
    .from("brand_relationships")
    .select("related_brand_id")
    .eq("brand_id", brandRow.id)
    .eq("relationship_type", "competitor");
  if (edgeErr) throw edgeErr;

  const competitorIds = (edges ?? []).map((e) => e.related_brand_id);
  if (competitorIds.length === 0) {
    return {
      brand: brandRow.name,
      category: brandRow.category,
      competitors_checked: 0,
      signals: [],
      note: "No competitor-edge brands found for this brand (see brand_relationships) — nothing to check for signals.",
      found: true,
      source_tables: ["brands", "brand_relationships"],
    };
  }

  const lookbackWeeks = args.lookback_weeks ?? 8;
  const asOf = await getDatasetAsOfDate();
  const windowStart = new Date(asOf);
  windowStart.setDate(windowStart.getDate() - lookbackWeeks * 7);

  const { data: signals, error: signalErr } = await sb
    .from("competitor_signals")
    .select("brand_id, category, retailer_id, region, signal_date, signal_type, magnitude_pct, description")
    .in("brand_id", competitorIds)
    .gte("signal_date", windowStart.toISOString().slice(0, 10))
    .order("signal_date", { ascending: false })
    .limit(20);
  if (signalErr) throw signalErr;

  const competitorIdsInResults = [...new Set((signals ?? []).map((s) => s.brand_id))];
  const { data: competitorBrands } = competitorIdsInResults.length
    ? await sb.from("brands").select("id, name").in("id", competitorIdsInResults)
    : { data: [] as { id: number; name: string }[] };
  const nameById = new Map((competitorBrands ?? []).map((b) => [b.id, b.name]));

  const enrichedSignals = (signals ?? []).map((s) => ({
    competitor_brand: nameById.get(s.brand_id) ?? `brand_id ${s.brand_id}`,
    category: s.category,
    retailer_id: s.retailer_id,
    region: s.region,
    signal_date: s.signal_date,
    signal_type: s.signal_type,
    magnitude_pct: s.magnitude_pct,
    description: s.description,
  }));

  return {
    brand: brandRow.name,
    category: brandRow.category,
    competitors_checked: competitorIds.length,
    lookback_weeks: lookbackWeeks,
    signals: enrichedSignals,
    found: true,
    source_tables: ["brands", "brand_relationships", "competitor_signals"],
  };
}
