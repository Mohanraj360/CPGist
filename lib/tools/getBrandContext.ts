import { getSupabaseServerClient } from "@/lib/supabase";
import { getDatasetAsOfDate } from "@/lib/tools/datasetClock";

export interface BrandContextArgs {
  brand: string;
  category?: string;
}

// Pulls a brand's structural relationships (siblings, category+region-scoped
// competitors) and any grounded qualitative signal_notes touching it in the
// last ~8 weeks of data. This is the Phase 2 knowledge-graph-lite layer:
// other tools call this internally (or the agent calls it directly) to add
// cross-brand context to an otherwise single-metric answer.
export async function getBrandContext(args: BrandContextArgs) {
  const sb = await getSupabaseServerClient();

  const { data: brandRow, error: brandErr } = await sb
    .from("brands")
    .select("id, name, category, parent_company, home_regions")
    .ilike("name", args.brand)
    .limit(1)
    .maybeSingle();

  if (brandErr) throw brandErr;
  if (!brandRow) {
    return {
      brand: args.brand,
      found: false,
      note: "No matching brand found.",
      source_tables: ["brands"],
    };
  }

  const { data: relationships, error: relErr } = await sb
    .from("brand_relationships")
    .select("related_brand_id, relationship_type, category, overlapping_regions")
    .eq("brand_id", brandRow.id);
  if (relErr) throw relErr;

  const relatedIds = (relationships ?? []).map((r) => r.related_brand_id);
  const { data: relatedBrands } = relatedIds.length
    ? await sb.from("brands").select("id, name").in("id", relatedIds)
    : { data: [] as { id: number; name: string }[] };
  const nameById = new Map((relatedBrands ?? []).map((b) => [b.id, b.name]));

  const siblings = (relationships ?? [])
    .filter((r) => r.relationship_type === "sibling")
    .map((r) => nameById.get(r.related_brand_id))
    .filter(Boolean);

  const competitors = (relationships ?? [])
    .filter((r) => r.relationship_type === "competitor")
    .map((r) => ({
      name: nameById.get(r.related_brand_id),
      overlapping_regions: r.overlapping_regions,
    }));

  // Phase 7 fix: anchor to the dataset's own most recent date, not
  // wall-clock `new Date()` — see lib/tools/datasetClock.ts for why this
  // was silently returning zero rows before.
  const asOf = await getDatasetAsOfDate();
  const windowStart = new Date(asOf);
  windowStart.setDate(windowStart.getDate() - 56); // ~8 weeks

  const { data: notes, error: notesErr } = await sb
    .from("signal_notes")
    .select("note_type, note_text, region, date_start, date_end")
    .eq("brand_id", brandRow.id)
    .gte("date_end", windowStart.toISOString().slice(0, 10))
    .order("date_end", { ascending: false })
    .limit(10);
  if (notesErr) throw notesErr;

  return {
    brand: brandRow.name,
    category: brandRow.category,
    parent_company: brandRow.parent_company ?? null,
    home_regions: brandRow.home_regions ?? null,
    siblings,
    competitors,
    recent_signal_notes: notes ?? [],
    found: true,
    source_tables: ["brands", "brand_relationships", "signal_notes"],
  };
}
