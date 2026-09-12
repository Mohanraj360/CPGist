import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const sb = getSupabaseServerClient();

  const { data, error } = await sb
    .from("alerts")
    .select("id, brand_id, retailer_id, category, region, alert_type, week_ending, swing_pct, narrative, created_at")
    .order("week_ending", { ascending: false })
    .order("swing_pct", { ascending: true }) // most negative (biggest drop) first within a week, roughly "most severe"
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alerts: data ?? [] });
}
