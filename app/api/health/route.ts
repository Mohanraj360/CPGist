import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const checkedAt = new Date().toISOString();
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, authenticated: false, checkedAt }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("sales_facts")
      .select("week_ending")
      .order("week_ending", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({
      ok: true,
      authenticated: true,
      database: { ok: true, latestWeekEnding: data?.week_ending ?? null },
      checkedAt,
    });
  } catch (error) {
    console.error("[v0] health check failed", error);
    return NextResponse.json({ ok: false, authenticated: true, database: { ok: false }, checkedAt }, { status: 503 });
  }
}
