import { getSupabaseServerClient } from "@/lib/supabase";

export interface ChannelMixArgs {
  brand: string;
}

export async function getChannelMix(args: ChannelMixArgs) {
  const sb = await getSupabaseServerClient();

  const { data, error } = await sb
    .from("v_channel_mix")
    .select("brand_name, channel, channel_dollar_sales, total_dollar_sales, channel_mix_pct")
    .eq("brand_name", args.brand)
    .order("channel_mix_pct", { ascending: false });

  if (error) throw error;

  return {
    brand: args.brand,
    channel_mix: data ?? [],
    source_tables: ["v_channel_mix"],
  };
}
