import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LegalPageLayout } from "@/components/site/LegalPageLayout";
import { useConsent } from "@/lib/consent";

export default function Cookies() {
  const { preferences, openPreferences } = useConsent();

  return (
    <LegalPageLayout
      content={{
        title: "Cookie Policy",
        description:
          "The cookies and similar technologies CPGist actually uses, their purposes and retention periods, and how to change your consent choices at any time.",
        path: "/cookies",
        version: "0.9-draft",
        effectiveDate: "October 11, 2026",
        intro:
          "This policy documents the cookies and similar technologies this website actually uses — not placeholders or wishful thinking. It will be updated before any new technology is activated.",
        sections: [
          {
            id: "what-are-cookies",
            heading: "1. Cookies and similar technologies",
            paragraphs: [
              "Cookies are small pieces of data a website stores in your browser. \"Similar technologies\" includes local storage and other browser storage that works much the same way. This policy covers both.",
            ],
          },
          {
            id: "what-we-use",
            heading: "2. What this site actually uses",
            bullets: [
              "Consent storage: your cookie choices are saved in your browser under the key “cpgist_cookie_preferences_v1” (local storage). It holds your analytics choice, a timestamp, and a version. Retention: until you clear it or withdraw consent.",
              "Session cookies (reserved): once sign-in is connected to an identity provider, the workspace will set a strictly necessary, httpOnly session cookie to keep you signed in. None are set today because authentication isn't connected yet.",
              "No advertising or cross-site tracking of any kind is used. No session-replay or heat-mapping scripts are used.",
            ],
          },
          {
            id: "categories",
            heading: "3. Categories",
            bullets: [
              "Strictly necessary — always active. Required for core site functions: navigation, form security, and remembering your consent choice. These can't be switched off.",
              "Analytics — optional, off by default, and never activated without your consent. No analytics provider is currently active; if one is added, your recorded choice will be applied first.",
            ],
          },
          {
            id: "manage",
            heading: "4. Changing or withdrawing consent",
            paragraphs: [
              "Use the “Cookie Settings” link in the footer, the button below, or clear the consent entry in your browser storage. Withdrawing optional consent takes effect immediately; strictly necessary storage continues to operate because the site cannot function without it.",
            ],
          },
          {
            id: "providers",
            heading: "5. Third-party providers",
            paragraphs: [
              "No third-party analytics, advertising, or tracking providers are active on this site today. Before any is added, this policy and the dependency inventory will be updated and your consent will be requested for the relevant category.",
            ],
          },
        ],
      }}
      bannerSlot={
        <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-slate-200 bg-white p-6" data-testid="cookies-settings-card">
          <h2 className="text-lg font-semibold text-navy-950">Your current choices</h2>
          {preferences ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <Badge variant="outline">Strictly necessary: always on</Badge>
              <Badge variant={preferences.analytics ? "default" : "outline"} data-testid="cookies-analytics-status">
                Analytics: {preferences.analytics ? "accepted" : "rejected"}
              </Badge>
              <span className="text-xs text-slate-500">Saved {new Date(preferences.updatedAt).toLocaleString()}</span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              No choice recorded yet — the consent banner will keep appearing until you make a
              choice. Optional categories are never pre-selected.
            </p>
          )}
          <Button onClick={openPreferences} className="mt-4" data-testid="cookies-open-settings">
            Cookie Settings
          </Button>
        </div>
      }
    />
  );
}
