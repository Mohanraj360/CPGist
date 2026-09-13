import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Phase 6: this used to be a single stateless client built from the anon
// key alone (`persistSession: false`, no user context at all). That client
// still worked for every tool query pre-RLS, because there was no RLS to
// enforce — but it's exactly the wrong client now: with row-level security
// live (see supabase/schema.sql), a request carrying no user identity
// resolves auth.uid() to null, current_org_id() to null, and every
// org_isolation policy to false. Every tool call would have silently
// returned empty results for every real signed-in user.
//
// This now builds a request-scoped client that reads the caller's session
// from cookies (via @supabase/ssr), so PostgREST forwards their JWT and RLS
// applies as *them*, not as an anonymous, org-less request. Same exported
// function name/signature as before on purpose — every lib/tools/*.ts file
// and the agent/forecast/feedback routes already call
// `getSupabaseServerClient()` and don't need to change.
//
// Only valid inside a Route Handler / Server Component request scope
// (needs `cookies()` from next/headers) — not a general-purpose client
// factory for scripts or background jobs. The synthetic-data loader
// (scripts/generate_synthetic_data.py) intentionally uses the
// service-role key directly instead, since bulk-loading has no end-user
// session to thread through and needs to bypass RLS entirely.
export async function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.JWT;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Route Handlers can set cookies; this only throws if called from
          // a context that can't (e.g. a Server Component render). Session
          // refresh in that case is handled by middleware.ts instead.
        }
      },
    },
  });
}
