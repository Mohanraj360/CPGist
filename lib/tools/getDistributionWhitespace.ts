import { getSupabaseServerClient } from "@/lib/supabase";

export interface DistributionWhitespaceArgs {
  brand: string;
  category: string;
  region?: string; // optional — narrows to retailers in a specific region (e.g. "Gulf - Qatar")
}

export async function getDistributionWhitespace(args: DistributionWhitespaceArgs) {
  const sb = getSupabaseServerClient();

  let query = sb
    .from("v_distribution_gaps")
    .select("product_name, category, brand_name, retailer_name, channel, region, product_acv, category_avg_acv, acv_gap_vs_category")
    .eq("brand_name", args.brand)
    .eq("category", args.category);

  if (args.region) {
    query = query.eq("region", args.region);
  }

  const { data, error } = await query.order("acv_gap_vs_category", { ascending: false });

  if (error) throw error;

  return {
    brand: args.brand,
    category: args.category,
    region: args.region ?? "all regions",
    whitespace: data ?? [],
    source_tables: ["v_distribution_gaps"],
  };
}
