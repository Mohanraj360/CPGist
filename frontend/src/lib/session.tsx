import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "./api";

// Hand-written mirror of the User Pydantic model in backend/models/auth.py.
export interface User {
  user_id: string;
  email: string;
  name: string;
  picture: string | null;
  auth_methods: ("google" | "password")[];
  created_at: string;
}

export const SESSION_QUERY_KEY = ["auth", "session"] as const;

/**
 * Sessions are httpOnly cookies the backend sets; the frontend never reads or
 * stores a token. `/auth/session` returns the user or null without throwing,
 * so public pages can render regardless of auth state.
 */
const fetchSession = () => apiGet<User | null>("/auth/session");

interface SessionContextValue {
  user: User | null;
  isLoading: boolean;
  /** Re-read the session after a successful sign-in/sign-up. */
  beginSession: () => Promise<void>;
  /** Always route sign-out through here — it clears the react-query cache too. */
  endSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Skip the probe while an OAuth callback is in flight: AuthCallback exchanges
  // the session_id and establishes the cookie first.
  const oauthInFlight = typeof window !== "undefined" && window.location.hash.includes("session_id=");

  const { data, isLoading } = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    enabled: !oauthInFlight,
    staleTime: 60_000,
    retry: false,
  });

  const beginSession = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
  }, [queryClient]);

  const endSession = useCallback(async () => {
    try {
      await apiPost("/auth/logout");
    } finally {
      // Clearing only the server session would leak the previous account's
      // cached data to the next sign-in on this browser.
      queryClient.clear();
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    }
  }, [queryClient]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user: data ?? null,
      isLoading: oauthInFlight ? false : isLoading,
      beginSession,
      endSession,
    }),
    [data, isLoading, oauthInFlight, beginSession, endSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

/**
 * Start the Emergent Google Auth flow.
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */
export function startGoogleAuth(): void {
  const redirectUrl = `${window.location.origin}/workspace`;
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}
