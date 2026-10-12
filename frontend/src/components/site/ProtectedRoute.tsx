import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSession } from "@/lib/session";

/**
 * Gates a route on a server-verified session. Three states: loading (session
 * probe in flight), authenticated (render), unauthenticated (redirect to
 * /signin). The server is the source of truth — no cookie sniffing here.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-page" role="status" data-testid="protected-route-loading">
        <Loader2 aria-hidden="true" className="size-7 animate-spin text-navy-700" />
        <span className="sr-only">Checking your session…</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/signin" replace />;

  return <>{children}</>;
}
