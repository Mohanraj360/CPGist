"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-xs text-muted hover:text-white underline underline-offset-2"
    >
      Sign out
    </button>
  );
}
