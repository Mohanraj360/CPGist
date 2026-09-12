import { getSupabaseServerClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// This dataset is synthetic and frozen in time — its most recent
// week_ending is whatever the generator produced (2025-12-28 as of Phase
// 1's run), not a live feed that keeps pace with wall-clock "now". Any
// "recent"/"last N weeks" window has to anchor to the dataset's own most
// recent date, not `new Date()`.
//
// Found this the hard way: getBrandContext.ts's recent_signal_notes window
// was `new Date() - 56 days`, which was fine when Phase 2 wrote it (real
// time and dataset time were close together) and silently broke the moment
// real time drifted past the dataset's last date — confirmed empty (0 of
// 501 signal_notes ever qualify) as of this phase, checked directly against
// Postgres before touching any code. Centralizing the fix here so
// getCompetitiveSignals (this phase) doesn't ship with the same bug on day
// one, and so any future "recent window" tool has one correct place to
// pull the anchor from instead of reaching for `new Date()`.
//
// Phase 7 (alerts): accepts an optional client because
// getSupabaseServerClient() is session-scoped (needs a logged-in user's
// cookies to authenticate as anything but `anon`, which has zero grants
// under Phase 6's RLS). A cron job has no session — calling this with no
// argument from that context would silently authenticate as `anon`,
// get permission-denied/empty back, and fall through to the wrong-answer
// `new Date()` fallback below. The cron route passes its service-role
// client explicitly instead. Also: the module-level cache only stores a
// *successful* lookup, on purpose — caching a bad fallback value would
// serve that wrong date to every caller (including legitimate
// authenticated ones) until the server process restarts.
let cachedAsOf: string | null = null;

export async function getDatasetAsOfDate(client?: SupabaseClient): Promise<string> {
  if (cachedAsOf) return cachedAsOf;

  const sb = client ?? getSupabaseServerClient();
  const { data, error } = await sb
    .from("sales_facts")
    .select("week_ending")
    .order("week_ending", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  if (!data?.week_ending) {
    // Don't cache this — could be a genuinely empty table, or could be an
    // under-permissioned client (anon, wrong RLS scope). Either way, the
    // next caller (possibly with a working client) deserves a fresh try
    // rather than being stuck with today's wrong fallback forever.
    return new Date().toISOString().slice(0, 10);
  }

  cachedAsOf = data.week_ending;
  return data.week_ending;
}
