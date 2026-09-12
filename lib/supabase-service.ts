import { createClient } from "@supabase/supabase-js";

// For background jobs only (currently just app/api/cron/detect-anomalies).
// Unlike lib/supabase.ts's getSupabaseServerClient(), this doesn't need
// cookies()/request scope — a cron trigger has no end-user session to read
// one from — and it uses the service-role key, which bypasses RLS
// entirely. That's correct here: the anomaly detector needs to read across
// whatever data exists to compute swings, and it writes into `alerts`,
// which has no INSERT policy for `authenticated` (see schema.sql) —
// writing as a normal user would fail regardless.
//
// Never import this into anything that handles a real user's request path
// (lib/tools/*.ts, app/api/agent, etc.) — those must stay on the
// session-scoped client so RLS actually applies as that user.
export function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
