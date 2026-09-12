"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

// Phase 6: email+password rather than magic-link. Magic link needs a real
// email provider configured on the Supabase project plus an /auth/callback
// route to exchange the emailed code for a session -- extra moving parts
// that can't be demoed or tested without a live project either way. Password
// auth works the same in a fresh Supabase project with zero extra config,
// which matters for a portfolio piece someone else will actually try to run.
export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupNotice, setSignupNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSignupNotice(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // If email confirmation is enabled on the Supabase project, there's
        // no session yet at this point -- the handle_new_user() trigger
        // (supabase/schema.sql) still fires on the auth.users insert, so
        // the profile/org assignment happens regardless of whether
        // confirmation is required.
        setSignupNotice("Account created. If email confirmation is enabled on your Supabase project, check your inbox before signing in.");
        setMode("signin");
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink">
      <div className="w-full max-w-sm bg-panel rounded-2xl p-6">
        <h1 className="text-lg font-semibold mb-1">CPGist</h1>
        <p className="text-xs text-muted mb-6">
          {mode === "signin" ? "Sign in to your account" : "Create an account"}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
          <label className="text-sm">
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {signupNotice && <p className="text-xs text-green-400">{signupNotice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-accent px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setSignupNotice(null);
          }}
          className="mt-4 text-xs text-muted hover:text-white underline underline-offset-2"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
