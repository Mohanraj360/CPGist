# Phase 8 rebuild notes (proactive monitoring / alerts)

**Numbering note**: the original 9-phase plan had "Phase 7" as proactive
monitoring/alerts and "Phase 8" as competitor intelligence. The delivery I
picked this up from had already used `PHASE7_NOTES.md` for competitor
intelligence (`competitor_signals`), so this phase is numbered 8 to avoid
overwriting that file — it's the alerts/monitoring work from the original
plan's Phase 7, just filed under a different number. Only "positioning
polish" (original Phase 9) is left after this.

## What changed

The whole product has been reactive so far — user asks, agent answers.
This phase adds a layer that watches the data on its own schedule and
surfaces findings unprompted, closer to "an analyst who's always on
shift" than a chatbot that only speaks when spoken to.

**`supabase/schema.sql`** — new `alerts` table: `brand_id`, `retailer_id`,
`category`, `region`, `alert_type`, `week_ending`, `baseline_units`,
`actual_units`, `swing_pct`, `narrative`, `org_id`, unique on
`(brand_id, retailer_id, week_ending, alert_type)` so re-running detection
against this frozen dataset upserts instead of duplicating. RLS follows
the exact `org_isolation` pattern Phase 6 established — `authenticated`
gets `SELECT` only (the table is written by the cron job via the
service-role key, never by a user request), `anon` gets nothing.

**`lib/alerts/detectAnomalies.ts`** — the detector. Aggregates
`sales_facts` to `(brand, retailer, week)`, fits a trailing 4-week
non-promo baseline per pair (same method `v_promo_lift`/`getForecast` use
elsewhere in this codebase, deliberately — a different baseline method
here would make "50%" mean something different than it does anywhere
else), and flags non-promo weeks where the swing exceeds a threshold.

**`lib/supabase-service.ts`** (new) — a service-role client for
background jobs. Phase 6's `getSupabaseServerClient()` is session-scoped
(reads cookies to authenticate as the calling user); a cron trigger has no
session, so it needs its own client that bypasses RLS the same way the
bulk data loader already does.

**`app/api/cron/detect-anomalies/route.ts`** (new) — runs the detector,
upserts results. Checks its own `CRON_SECRET` bearer token rather than
going through the normal signed-in-user gate (Vercel's documented cron-auth
pattern — Vercel sets this header automatically on scheduled invocations
when `CRON_SECRET` is configured on the project).

**`middleware.ts`** — exempted `/api/cron/*` from the session-based
redirect/401 gate, since the route above handles its own auth. Everything
else is unchanged.

**`vercel.json`** (new) — daily schedule (`0 6 * * *`) for the cron route.

**`app/api/alerts/route.ts`** (new) — plain RLS-scoped read endpoint for
the UI, same pattern as every other data route (session client, RLS
applies as the calling user).

**`components/AlertsFeed.tsx`** (new) + wired into `ChatUI.tsx`'s header —
a bell icon with an unread-style badge, opens a dropdown feed of recent
alerts, polls every 5 minutes (alerts come from a daily batch job, not a
live stream, so aggressive polling would just be wasted requests).

## Why distribution-based alerts aren't here

The original plan's example threshold ("distribution drop >X pts") calls
for exactly the kind of alert this phase doesn't ship. Phase 7's
`competitor_signals` work found that `acv_distribution` doesn't actually
drift slowly like `generate_synthetic_data.py`'s own comments claim —
`acv_start`/`acv_drift` are drawn per-row instead of per-series, so
week-over-week ACV deltas are close to independent noise (one real series
swung 50.8 → 35.5 → 53.3 → 83.0 across four straight weeks). A
distribution-drop alert built on that field would mostly be flagging
noise, not real gaps. Extended the same precedent Phase 7 already
established for `competitor_signals` (drop `distribution_gain`/
`distribution_loss`, keep only the correctly-grounded `promo_launch`
type) rather than reintroducing the same bad signal through a new table.
Velocity swings use `units`, which isn't affected by this bug.

## A near-miss I caused, caught, and fixed before it shipped

Adding the optional-client parameter to `datasetClock.ts` (needed so the
cron job's service-role client could be threaded through, instead of the
function implicitly calling the session-scoped client and silently
authenticating as `anon` — zero grants under Phase 6's RLS) meant
rewriting the function, and my first pass reintroduced the *exact*
`string | null` vs `string` type error the previous phase's notes
describe hitting and fixing (`return cachedAsOf` where the module-level
cache variable is typed `string | null` but the function returns
`Promise<string>` — assigning a narrowed value to a `let` doesn't keep
the narrowing on read). Caught by the same `tsc --noEmit` check used
throughout this rebuild, fixed by returning the narrowed local
(`data.week_ending`) instead of the mutable cache variable. Mentioning
this not because the bug shipped (it didn't) but because it's a good
illustration of why every phase in this rebuild re-runs the type-checker
rather than trusting that a file already fixed once stays fixed once
touched again.

Separately: `getDatasetAsOfDate()`'s cache now only stores *successful*
lookups. In the version I inherited, an empty/permission-denied result
would cache the wrong `new Date()` fallback and serve it to every
subsequent caller — including legitimate authenticated ones — until the
server process restarted. Since this phase adds a second call path (the
cron job) that's genuinely more likely to hit that empty-result case
first (if the cron ever runs before any real user request warms the
cache), a bad first call silently poisoning every later one became a real
risk rather than a theoretical one. Fixed by not caching the fallback
path at all.

## Verified

- **Threshold picked from real data, not guessed**: checked the actual
  distribution of non-promo week-over-week unit swings across the whole
  dataset first — |swing| > 50% flags ~3.4% of non-promo weeks at the
  per-product grain, a genuinely notable tail rather than most of the
  dataset. Aggregating to brand+retailer (what the detector actually
  does) should be more conservative still, since summing multiple
  products' independent noise together tends to average it down.
- **Reimplemented the exact detection logic independently in Python**
  against the real CSVs (same trailing-baseline method, same 12-week
  lookback, same threshold) rather than trusting the TypeScript in
  isolation: 64 alerts detected across 62 unique brand+retailer pairs —
  a real, non-trivial, non-overwhelming feed. Spot-checked the extremes
  (max +81.5%, matching the earlier noise-tail check's expected range)
  rather than just the count.
- **RLS on the new `alerts` table**, tested against the same auth stub
  used to verify Phase 6/7: seeded one org-1 alert and one org-2 phantom
  alert, queried as an org-1 authenticated user — exactly 1 visible, 0
  phantom. Queried as `anon` — hard permission-denied (no grant at all),
  not just an empty result, matching the established pattern.
- **Live-exercised the cron route's own auth gate** (not just
  type-checked): no `Authorization` header → 401; wrong secret → 401;
  correct secret → passes the gate and reaches the detection logic
  (confirmed it's genuinely the *route's* check succeeding, not
  middleware's, by the distinct error message: `"Unauthorized."` from the
  route vs. `"Unauthorized — please sign in."` from `middleware.ts`).
  Also confirms the `middleware.ts` exemption for `/api/cron/*` is
  correctly wired — the request reached the route at all rather than
  being redirected/blocked earlier.
- `npx tsc --noEmit` clean, `npm run build` compiles (`/api/alerts` and
  `/api/cron/detect-anomalies` both present in the route list).

## Not verified here

- **No live Vercel Cron trigger** — confirmed the route's own logic
  (auth gate, detection, upsert path) locally, but never watched an
  actual scheduled invocation fire against a deployed project. Worth
  doing once this is on Vercel with `CRON_SECRET` set — the header Vercel
  sends automatically is documented behavior, not something I could
  reproduce and confirm byte-for-byte here.
- **The upsert path against a real Supabase/PostgREST endpoint** — I
  verified the detection logic's *output* (via the Python
  reimplementation against Postgres directly) and the *route's control
  flow* (via live HTTP calls with dummy env vars, which correctly fails
  past the auth gate on the unreachable dummy Supabase URL), but never
  the actual `sb.from("alerts").upsert(...)` call against a live
  PostgREST instance, since I don't have one. The RLS/permission checks
  were done directly in Postgres (which is what actually enforces them;
  PostgREST is a thin layer on top), so I'm confident in the isolation
  behavior, but the upsert call shape itself (`onConflict` string
  format, etc.) is type-checked and follows the same pattern
  `getCompetitiveSignals.ts` and other tools already use successfully —
  not independently re-verified against a live endpoint.
- Same standing limitation as every phase since 3: no live Gemini call,
  so whether the agent ever references an active alert unprompted in a
  chat response (vs. only via the separate bell-icon feed) hasn't been
  tested — this phase deliberately did *not* wire alerts into the chat
  agent's system prompt or tools, since the spec calls for a separate
  feed/badge, not a chat-injected alert; flagging in case that's wanted
  as a follow-up.

## Decisions worth weighing in on

1. **Velocity-only, both directions (`_up` and `_down`), not just
   drops.** The original plan's phrasing focuses on drops ("distribution
   dropped 8pts... here's likely why"), but a sudden unexplained *jump*
   in a non-promo week is arguably just as actionable (competitor
   stockout redirecting demand, a retailer's own unannounced local promo,
   data quality issue worth checking) — kept both rather than only
   alerting on the pessimistic case.
2. **50% threshold, 12-week lookback, both picked from data — but not
   tuned per category.** Some categories may have structurally noisier
   demand than others (impulse categories vs. staples), which a single
   global threshold doesn't account for. Flagging as the first thing to
   revisit if the feed turns out to be too noisy or too quiet for
   specific categories once someone's actually looking at it day to day.
3. **5-minute client poll interval for the bell icon**, against a table
   that's actually written once a day. Deliberately loose — the cost of
   polling too slowly (a five-minute-stale badge count) is much lower
   than the cost of polling too aggressively against a table that rarely
   changes.
4. **Alerts aren't wired into the chat agent at all** — pure separate
   feed. Keeps this phase's scope contained and matches "distinct from
   on-demand chat" in the original ask, but means the agent can't
   currently say "by the way, there's an open alert on this brand" inside
   a normal chat answer even when one exists. Would be a natural
   `get_brand_context`-style extension if wanted.

---

Alerts are now real: detected from actual trailing-baseline swings
(threshold picked from real data, not assumed), written by a properly
auth-gated background job, RLS-isolated the same way every other table in
this rebuild is, and surfaced unprompted in the UI rather than only on
request. Only positioning polish (original Phase 9 — README and
empty-state copy reflecting the finished feature set) is left.
