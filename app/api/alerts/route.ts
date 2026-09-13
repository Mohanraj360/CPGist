import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const sb = await getSupabaseServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data, error } = await sb
      .from("alerts")
      .select("id, brand_id, retailer_id, category, region, alert_type, week_ending, swing_pct, title, description, narrative, severity, status, created_at")
      .order("week_ending", { ascending: false })
      .order("swing_pct", { ascending: true })
      .limit(30);

    if (error) throw error;
    return NextResponse.json({ alerts: data ?? [] });
  } catch (error) {
    console.error("[v0] Alerts route error:", error);
    return NextResponse.json({ error: "Alerts are temporarily unavailable." }, { status: 500 });
  }
}
