import { NextRequest, NextResponse } from "next/server";
import { detectVelocityAnomalies } from "@/lib/alerts/detectAnomalies";
import { getSupabaseServiceClient } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const maxDuration = 60;

// Triggered by Vercel Cron (see vercel.json) — no end-user session exists
// on this request, so it can't go through the normal auth gate in
// middleware.ts (exempted there — see the isPublicPath check) and instead
// checks its own secret, matching Vercel's documented cron-auth pattern:
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET is not configured on the server." }, { status: 500 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const alerts = await detectVelocityAnomalies();
    if (alerts.length === 0) {
      return NextResponse.json({ inserted: 0, message: "No anomalies above threshold this run." });
    }

    const sb = getSupabaseServiceClient();
    // Upsert on the (brand_id, retailer_id, week_ending, alert_type)
    // unique constraint — re-running against the same frozen dataset
    // (which this demo's data always is) re-detects the same anomalies
    // every time rather than erroring on a duplicate key or silently
    // duplicating rows.
    const { error, count } = await sb
      .from("alerts")
      .upsert(alerts, { onConflict: "brand_id,retailer_id,week_ending,alert_type", count: "exact" });

    if (error) throw error;

    return NextResponse.json({ inserted: count ?? alerts.length, detected: alerts.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Anomaly detection failed." }, { status: 500 });
  }
}
