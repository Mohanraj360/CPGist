import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// v1: just log the thumbs up/down against the insight text.
// v2 idea (per build spec): feed "things that historically worked" back into
// the agent's system prompt as few-shot context.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      insight_summary?: unknown;
      outcome?: unknown;
      analysis_id?: unknown;
      comment?: unknown;
    };
    const insightSummary = typeof body.insight_summary === "string" ? body.insight_summary.trim() : "";
    const outcome = body.outcome;

    if (!insightSummary || insightSummary.length > 10_000 || !["worked", "didnt_work", "unknown"].includes(String(outcome))) {
      return NextResponse.json({ error: "Requires a valid insight summary and outcome." }, { status: 400 });
    }

    const sb = getSupabaseServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const analysisId = typeof body.analysis_id === "string" ? body.analysis_id.trim().slice(0, 200) : null;
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2_000) : null;
    const { error } = await sb.from("insight_feedback").insert({
      insight_summary: insightSummary,
      outcome: String(outcome),
      analysis_id: analysisId,
      comment,
      user_id: user.id,
      feedback_type: "insight",
      org_id: 1,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[v0] Feedback route error:", err);
    return NextResponse.json({ error: "Feedback could not be saved." }, { status: 500 });
  }
}
