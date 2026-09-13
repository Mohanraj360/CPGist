import { getSupabaseServerClient } from "@/lib/supabase";

export interface BrandRankingArgs {
  category: string;
  retailer?: string;
  date_range?: { start: string; end: string };
}

// Ranks brands within a category by total $ sales (and share), using v_brand_share.
export async function getBrandRanking(args: BrandRankingArgs) {
  const sb = await getSupabaseServerClient();

  let query = sb
    .from("v_brand_share")
    .select("brand_id, brand_name, category, retailer_name, channel, week_ending, brand_dollar_sales, brand_share_pct")
    .eq("category", args.category);

  if (args.retailer) query = query.ilike("retailer_name", `%${args.retailer}%`);
  if (args.date_range) {
    query = query.gte("week_ending", args.date_range.start).lte("week_ending", args.date_range.end);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Aggregate to brand level across the returned weeks/retailers.
  const byBrand = new Map<string, { brand_name: string; total_dollar_sales: number; avg_share_pct: number; weeks: number }>();
  for (const row of data ?? []) {
    const key = row.brand_name;
    const existing = byBrand.get(key) ?? { brand_name: row.brand_name, total_dollar_sales: 0, avg_share_pct: 0, weeks: 0 };
    existing.total_dollar_sales += Number(row.brand_dollar_sales ?? 0);
    existing.avg_share_pct += Number(row.brand_share_pct ?? 0);
    existing.weeks += 1;
    byBrand.set(key, existing);
  }

  const ranking = Array.from(byBrand.values())
    .map((b) => ({
      brand_name: b.brand_name,
      total_dollar_sales: Math.round(b.total_dollar_sales),
      avg_brand_share_pct: b.weeks > 0 ? Math.round((b.avg_share_pct / b.weeks) * 10) / 10 : null,
    }))
    .sort((a, b) => b.total_dollar_sales - a.total_dollar_sales);

  return {
    category: args.category,
    retailer: args.retailer ?? "all retailers",
    date_range: args.date_range ?? "all available weeks",
    ranking,
    source_tables: ["v_brand_share"],
  };
}
