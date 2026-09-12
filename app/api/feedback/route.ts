import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// v1: just log the thumbs up/down against the insight text.
// v2 idea (per build spec): feed "things that historically worked" back into
// the agent's system prompt as few-shot context.
export async function POST(req: NextRequest) {
  try {
    const { insight_summary, outcome } = await req.json();

    if (!insight_summary || !["worked", "didnt_work", "unknown"].includes(outcome)) {
      return NextResponse.json({ error: "Requires insight_summary and a valid outcome." }, { status: 400 });
    }

    const sb = getSupabaseServerClient();
    const { error } = await sb.from("insight_feedback").insert({ insight_summary, outcome });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Feedback route error:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
