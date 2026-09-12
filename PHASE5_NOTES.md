# Phase 5 rebuild notes

## What changed

**`lib/tools/getForecast.ts`** — fully rewritten. The elasticity model no
longer proxies promo depth from `promo_type` (the old
`PROMO_TYPE_DEPTH` lookup table); it regresses directly on the real
`discount_depth_pct` column Phase 1 added to `sales_facts`. Also:

- Fit scope moved from "this brand+retailer's rows" (a handful of promo
  weeks — too thin to fit anything) to **per category**, pooled across all
  brands/retailers in that category — matches the original build brief's
  "per category" wording, and is what the data actually supports (see
  verification below).
- Brand/retailer resolution rewritten to look up `brands`/`retailers` by
  id (`ilike` exact-then-substring for brand, substring for retailer —
  same tolerance Phase 4 already established for retailer names), instead
  of the old `product_name.startsWith(args.brand)` string-matching hack.
- Added an R² diagnostic to the regression output, and split the single
  `caveat` string into a list of independent conditions (thin sample,
  weak fit, zero baseline) joined into one message — was previously a
  single hardcoded n<5 threshold.
- Returns `found: false` (with a `note` explaining why) instead of
  fabricating a zero-baseline projection when the brand or retailer name
  doesn't resolve at all — previously this was silent (empty arrays ->
  slope/intercept of 0 -> a nonsensical but not-obviously-wrong 0%/$0
  output).

**`supabase/views.sql`** — added `category` (from `products`) to
`v_promo_lift`, so the tool can filter by category without a second join.
Postgres requires new columns on a `CREATE OR REPLACE VIEW` to be
appended at the end of the select list, not inserted in logical order —
hit this once (`ERROR: cannot change name of view column "brand_id" to
"category"`) and fixed by moving `category` to the end of the select
instead of next to `product_name`.

**`app/api/forecast/route.ts`** — now returns HTTP 404 (with the
`found: false` body) when `getForecast` can't resolve the brand or
retailer, instead of always returning 200 with whatever shape
`getForecast` produced.

**`components/WhatIfSimulator.tsx`** — updated to branch on
`result.found === false` and show `result.note` instead of rendering
`undefined%` / `$undefined`; skips fetching the 8-point lift curve in
that case (every point would 404 the same way).

## Two real bugs found and fixed while building this

**1. `WhatIfSimulator.tsx`'s default brand/retailer were still `"Fizzly"`
/ `"Blinkit"`** — leftovers from the original 5-brand demo dataset,
neither of which exist anywhere in the Phase 1 110-brand/200-retailer
rebuild. This is the same stale-name bug class Phase 3 fixed in
`Sidebar.tsx` and `ChatUI.tsx`'s empty-state text, but this file wasn't
in scope for that pass, so it slipped through three phases untouched.
Found it while updating this file for the `found: false` handling above
— checked `brands.csv`/`retailers.csv` directly (`grep -i "fizzly\|
blinkit"` — zero matches), picked `True Water Co` + `QuickDash (Metro)`,
and confirmed against Postgres that the pairing has 832 real non-promo
weekly rows before wiring it in as the new default.

**2. `getForecast` could silently return a zero/near-zero projection for
an unmatched brand or retailer** rather than surfacing that nothing
matched. With the old code this was hard to notice (a `slope=0,
intercept=0` regression from an empty `points` array still returns a
numeric `projected_lift_pct: 0`), but it meant a typo'd brand name in the
What-If sliders would silently show "0% lift, $0 incremental" instead of
any indication the name didn't resolve. Added the explicit `found: false`
path and wired both the API route and the UI to handle it, rather than
just noting it as a known caveat.

## Verified against a real Postgres instance, loaded fresh for this phase

Installed Postgres 16 in this sandbox (`apt-get install postgresql` — the
network allowlist includes `archive.ubuntu.com`/`security.ubuntu.com`, so
this worked same as it apparently did in whatever environment ran Phases
1-4), loaded `schema.sql`, all six CSVs from `scripts/` (same explicit
column-list pattern Phase 2 flagged — `org_id` isn't in any Phase 1/2 CSV
header), and `views.sql`. Row counts matched Phase 1/2 notes exactly:

| table | rows |
|---|---|
| brands | 110 |
| retailers | 200 |
| products | 440 |
| sales_facts | 1,515,488 |
| brand_relationships | 316 |
| signal_notes | 501 |

**Confirmed the regression is worth building before building it**: ran
`corr(discount_depth_pct, pct_lift)` per category directly — 0.767 to
0.789 across all 10 categories, tens of thousands of points each. The old
`promo_type` proxy was leaving real accuracy on the table.

**Simulated the exact query chain `getForecast.ts` runs**, for True
Snacks (Salty Snacks, home region India - Tier 2/3):

- Category-level fit (26,490 points): slope 4.7667, intercept 6.8379,
  R² 0.5933 (Postgres `regr_r2`, matches `corr² ` from above within
  rounding).
- At `promo_depth=20`, predicted lift ≈ 102.2% — checked this against the
  real average lift for Ad-type promos in Salty Snacks at their actual
  average depth (20.0% depth → 102.7% avg lift): the model's prediction
  lands almost exactly on real, independently-aggregated data it wasn't
  fit against as a single point.
- Retailer resolution: "QuickDash" matches 7 retailers system-wide, but
  True Snacks (home region India - Tier 2/3) has **zero** sales rows at
  any of them — a real test of the `found: false`-adjacent "brand/retailer
  both resolve, but no baseline exists" caveat path, not a hypothetical.
  Confirmed a real hit too: True Snacks + `FreshMart (Tier 2/3)` (id 65,
  same home region) returns 348 non-promo rows, avg $4,038.90/week.
- Confirmed the true not-found path separately: a fabricated brand/retailer
  name (`%Zzznonexistent%`) returns zero rows from both `brands` and
  `retailers`, exercising the `found: false` branch for real.

**Build**: `npx tsc --noEmit` clean, `npm run build` compiles.

## Not verified here (same limitation as Phases 3-4)

No live Gemini call — this sandbox still has no network path to
`generativelanguage.googleapis.com`. What's verified is that the tool
function returns correct, grounded numbers when queried directly and the
project type-checks/builds; whether Gemini's narrative actually leans on
the new `regression`/`caveat` fields usefully (e.g. mentioning R² or
sample size when the fit is weak) needs a real run with a live API key.

## Decisions I made that you may want to weigh in on

1. **Category-level fit only — no region dimension in the regression.**
   The original brief calls for "per category" elasticity, and category
   alone already gives tens of thousands of points with strong signal
   (r ~0.77-0.79). Splitting further by region would thin each fit
   substantially and the brief doesn't ask for it. Flagging since region
   is a first-class dimension everywhere else in this rebuild (Phase 1
   onward) — if region-level elasticity becomes its own ask, this is
   where it'd go.
2. **`found: false` returns HTTP 404 from `/api/forecast`, not 200 with
   an error-shaped body.** Consistent with treating "brand/retailer
   doesn't exist" as a real not-found condition rather than a
   200-with-caveat, which is what the *zero-baseline-but-both-resolved*
   case still does (that one stays 200, since the brand and retailer are
   both real — there's just no overlap in the data, which is itself a
   legitimate finding, e.g. for the QuickDash/True Snacks case above).
3. **Multiple caveats get joined into one string, not returned as an
   array.** Keeps the shape backward-compatible with `WhatIfSimulator.tsx`
   and `ChatMessageBubble.tsx`, both of which already render `caveat` as
   a single optional string. Would split into a `string[]` if a caller
   ever needs to style/filter individual caveats separately.
4. **Fixed the `Fizzly`/`Blinkit` default-props bug here rather than
   flagging it for a dedicated cleanup pass.** Same reasoning Phase 3
   used for the same bug class: I was already touching this file's
   result-handling for the `found: false` change, and shipping a demo
   with defaults that 404 on first load seemed worse than the small
   scope creep.

---

The elasticity model is now grounded in real discount-depth data instead
of a categorical proxy, the What-If Simulator's defaults actually resolve
to real data, and both the API and UI handle the brand/retailer-not-found
case explicitly instead of silently producing a zero. Next open item from
Phase 1's original schema notes: `org_id` exists on `brands`/
`retailers`/`sales_facts` (defaulted, unenforced) for a future Supabase
Auth + RLS pass — worth confirming with you whether that's still the
intended next phase or has been resequenced, since Phase 4's closing note
and Phase 1's schema comment point to two different things both labeled
"Phase 5."
