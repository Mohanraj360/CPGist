import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "./api";

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture: string | null;
  auth_methods: ("google" | "password")[];
  created_at: string;
}

export const SESSION_QUERY_KEY = ["auth", "session"] as const;
const fetchSession = () => apiGet<User | null>("/auth/session");

interface SessionContextValue {
  user: User | null;
  isLoading: boolean;
  beginSession: () => Promise<void>;
  endSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Keep OAuth state reactive. The callback removes the URL hash, but
  // history.replaceState alone does not trigger a React render.
  const [oauthInFlight, setOauthInFlight] = useState(
    () => typeof window !== "undefined" && window.location.hash.includes("session_id="),
  );

  const { data, isLoading } = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    enabled: !oauthInFlight,
    staleTime: 60_000,
    retry: false,
  });

  const beginSession = useCallback(async () => {
    // Force a fresh session read after the backend sets the httpOnly cookie.
    // Invalidating a disabled query alone does not guarantee it will refetch.
    await queryClient.fetchQuery({
      queryKey: SESSION_QUERY_KEY,
      queryFn: fetchSession,
      staleTime: 0,
    });
    setOauthInFlight(false);
  }, [queryClient]);

  const endSession = useCallback(async () => {
    try {
      await apiPost("/auth/logout");
    } finally {
      queryClient.clear();
      setOauthInFlight(false);
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
