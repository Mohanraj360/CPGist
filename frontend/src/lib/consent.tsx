import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

/**
 * Cookie consent state. Choices persist in localStorage under one key and are
 * never pre-selected for optional categories. No third-party analytics or
 * advertising providers are active on this site today — the "analytics"
 * category only records consent for when one might be added.
 */

export interface CookiePreferences {
  essential: true;
  analytics: boolean;
  updatedAt: string; // ISO timestamp chosen by the user's browser
  version: string;
}

export const COOKIE_STORAGE_KEY = "cpgist_cookie_preferences_v1";
const CONSENT_VERSION = "1";

interface ConsentContextValue {
  preferences: CookiePreferences | null;
  bannerVisible: boolean;
  prefsOpen: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  savePreferences: (analytics: boolean) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

function readStored(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookiePreferences;
    if (typeof parsed.analytics !== "boolean") return null;
    return parsed;
  } catch (error) {
    // Corrupt or unreadable entry: treat as "no choice recorded" so the banner
    // reappears and the user can choose again, rather than assuming consent.
    console.warn("Cookie consent: could not read stored preferences.", error);
    return null;
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(readStored);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const persist = useCallback((analytics: boolean, note: string) => {
    const next: CookiePreferences = {
      essential: true,
      analytics,
      updatedAt: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    try {
      window.localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      // Storage unavailable (private mode, quota, blocked): the choice applies for
      // this page view but isn't persisted, so the banner will reappear later.
      console.warn("Cookie consent: preferences could not be persisted.", error);
    }
    setPreferences(next);
    setPrefsOpen(false);
    toast.success(note);
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      preferences,
      bannerVisible: preferences === null,
      prefsOpen,
      acceptAll: () => persist(true, "Optional cookies accepted."),
      rejectOptional: () =>
        persist(false, "Optional cookies rejected. Only strictly necessary storage will be used."),
      savePreferences: (analytics: boolean) => persist(analytics, "Your cookie preferences were saved."),
      openPreferences: () => setPrefsOpen(true),
      closePreferences: () => setPrefsOpen(false),
    }),
    [preferences, prefsOpen, persist],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used within ConsentProvider");
  return ctx;
}
