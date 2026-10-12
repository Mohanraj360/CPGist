import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useConsent } from "@/lib/consent";

/**
 * Cookie consent banner + preferences dialog.
 * - Optional categories are never pre-selected.
 * - Rejecting is exactly as easy as accepting (equal, adjacent buttons).
 * - Keyboard accessible; choices persist and can be changed later via the
 *   footer's "Cookie Settings" link or the /cookies page.
 */
export function CookieConsent() {
  const {
    bannerVisible,
    prefsOpen,
    preferences,
    acceptAll,
    rejectOptional,
    savePreferences,
    openPreferences,
    closePreferences,
  } = useConsent();
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    if (prefsOpen) setAnalytics(preferences?.analytics ?? false);
  }, [prefsOpen, preferences]);

  return (
    <>
      {bannerVisible && !prefsOpen && (
        <div className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-4 sm:px-6" role="region" aria-label="Cookie consent" data-testid="cookie-banner">
          <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:p-5">
            <h2 className="text-sm font-semibold text-navy-950">Your cookie choices</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
              Strictly necessary storage keeps this site working. We don't activate analytics,
              advertising, or tracking technologies before you give consent — and no third-party
              analytics or ad providers are active on this site today. Accept optional cookies,
              reject them, or customize.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Button variant="outline" size="sm" onClick={rejectOptional} data-testid="cookie-banner-reject-optional">
                Reject optional
              </Button>
              <Button variant="ghost" size="sm" onClick={openPreferences} data-testid="cookie-banner-customize">
                Customize
              </Button>
              <Button size="sm" onClick={acceptAll} data-testid="cookie-banner-accept-optional">
                Accept optional
              </Button>
              <Link to="/cookies" className="text-xs text-navy-700 underline underline-offset-2 sm:ml-2" data-testid="cookie-banner-policy-link">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      )}

      <Dialog open={prefsOpen} onOpenChange={(o) => (o ? openPreferences() : closePreferences())}>
        <DialogContent className="sm:max-w-lg" data-testid="cookie-preferences-dialog">
          <DialogHeader>
            <DialogTitle>Cookie preferences</DialogTitle>
            <DialogDescription>
              Choose which categories of cookies and similar storage CPGist may use. Your choice is
              stored on this device and can be changed at any time from the footer's "Cookie
              Settings" link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
              <Checkbox id="cookie-category-essential" checked disabled data-testid="cookie-category-essential" />
              <div>
                <Label htmlFor="cookie-category-essential" className="text-sm font-medium">
                  Strictly necessary — always active
                </Label>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Required for core site functions: navigation, form security, and remembering this
                  consent choice (stored locally in your browser). These can't be switched off.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
              <Checkbox
                id="cookie-category-analytics"
                checked={analytics}
                onCheckedChange={(c) => setAnalytics(c === true)}
                data-testid="cookie-category-analytics"
              />
              <div>
                <Label htmlFor="cookie-category-analytics" className="text-sm font-medium">
                  Analytics — optional, not pre-selected
                </Label>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Aggregated, anonymous usage measurement. No analytics provider is currently
                  active on this site; your choice is recorded and would apply before any is added.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={rejectOptional} data-testid="cookie-dialog-reject-optional">
              Reject optional
            </Button>
            <Button variant="outline" onClick={() => savePreferences(analytics)} data-testid="cookie-dialog-save-preferences">
              Save preferences
            </Button>
            <Button onClick={acceptAll} data-testid="cookie-dialog-accept-optional">
              Accept optional
            </Button>
          </div>

          <p className="text-xs text-slate-500">
            See the{" "}
            <Link to="/cookies" className="text-navy-700 underline underline-offset-2" data-testid="cookie-dialog-policy-link">
              Cookie Policy
            </Link>{" "}
            for the technologies actually used and their retention periods.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
