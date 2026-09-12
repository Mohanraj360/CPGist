"use client";

import { createBrowserClient } from "@supabase/ssr";

// Client Component client — used only by app/login/page.tsx to call
// supabase.auth.signInWithPassword / signUp. Everything else (the actual
// data queries) goes through the server client in lib/supabase.ts instead,
// so RLS is always enforced server-side, never relied on client-side.
export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(url, anonKey);
}
