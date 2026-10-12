import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiErrors";
import { useSession, type User } from "@/lib/session";
import { Logo } from "@/components/site/Logo";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "react-router-dom";

/**
 * Exchanges the one-time `session_id` from the auth redirect fragment for a
 * real httpOnly session, then lands the user in the workspace.
 *
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { beginSession } = useSession();
  const [error, setError] = useState<string | null>(null);
  // useRef (not state) set synchronously: StrictMode double-invokes effects and
  // a session_id may only be exchanged once.
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const sessionId = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("session_id");
    if (!sessionId) {
      setError("This sign-in link is incomplete. Please start again from the sign-in page.");
      return;
    }

    (async () => {
      try {
        await apiPost<User>("/auth/google/session", { session_id: sessionId });
        // Drop the one-time session_id from the URL before continuing.
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        await beginSession();
        navigate("/workspace", { replace: true });
      } catch (err) {
        setError(apiErrorMessage(err, "We couldn't complete sign-in. Please try again."));
      }
    })();
  }, [beginSession, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="flex justify-center">
          <Logo size={56} />
        </div>
        {error ? (
          <>
            <h1 className="mt-6 text-xl font-bold text-navy-950" data-testid="auth-callback-error-heading">
              Sign-in didn&rsquo;t complete
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600" data-testid="auth-callback-error">
              {error}
            </p>
            <Link to="/signin" className={buttonVariants({ className: "mt-6" })} data-testid="auth-callback-retry">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <Loader2 aria-hidden="true" className="mx-auto mt-6 size-7 animate-spin text-navy-700" />
            <h1 className="mt-4 text-xl font-bold text-navy-950">Signing you in…</h1>
            <p className="mt-2 text-sm text-slate-600" role="status" data-testid="auth-callback-status">
              Setting up your CPGist workspace.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
