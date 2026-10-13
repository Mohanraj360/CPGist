import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
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

  const { data, isLoading } = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
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
  }, [queryClient]);

  const endSession = useCallback(async () => {
    // Update the active query immediately so the header and protected routes
    // react to sign-out without requiring a page refresh.
    queryClient.setQueryData<User | null>(SESSION_QUERY_KEY, null);

    try {
      await apiPost("/auth/logout");
    } finally {
      // Clear user-specific cached data, then explicitly retain an anonymous
      // session value. Clearing alone can leave mounted observers showing stale
      // data until they fetch again.
      queryClient.clear();
      queryClient.setQueryData<User | null>(SESSION_QUERY_KEY, null);
    }
  }, [queryClient]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user: data ?? null,
      isLoading,
      beginSession,
      endSession,
    }),
    [data, isLoading, beginSession, endSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

/** Start CPGist's own Google OAuth flow through the same-origin API proxy. */
export function startGoogleAuth(): void {
  window.location.assign("/api/auth/google/start");
}
