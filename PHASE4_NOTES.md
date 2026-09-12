# Phase 4 rebuild notes

## What changed

**`components/Sidebar.tsx`** — expanded from 4 to 6 workflow templates, one
per available agent tool (previously 2 of 6 tools — `get_forecast` and
`get_brand_context`, both added in earlier phases — had zero entry point
anywhere in the UI):

1. Brand Ranking
2. Promo Lift Analysis
3. Channel Mix Shift
4. Distribution Whitespace (now region-scoped — see below)
5. Promo Scenario / What-If (`get_forecast`)
6. Competitive Context (`get_brand_context`)

Every brand/retailer/region name in these templates is verified against
the actual dataset, not placeholder text — see verification section below.
Same pre-fill/editable behavior as before (`onSelectTemplate` sets the
chat input, user can still edit before sending).

## Two real bugs found and fixed while building these

**1. `getDistributionWhitespace.ts` had no region filter at all**, even
though `v_distribution_gaps` has always had a `region` column and my own
Phase 2 and Phase 3 notes both flagged this as open debt. The plan's own
example template is literally "Where's my distribution whitespace in
[region]?" — building that template surfaced the gap directly, so I fixed
it rather than working around it: added an optional `region` arg to the
tool function, the Gemini tool declaration, and confirmed against Postgres
that a region-filtered query returns real, meaningful gaps (checked Urban
Crisps in Gulf - Qatar — see below).

**2. Retailer name matching was exact (`.eq`) everywhere, including in
`getBrandRanking.ts`, `getPromoLiftAnalysis.ts`, and `getForecast.ts`
(twice).** Phase 1's retailer names all carry a region suffix —
`QuickDash (Metro)`, `QuickDash (UAE)`, `QuickDash (Qatar)`,
`QuickDash #2 (Metro)`, etc. — so a natural request like "promo lift at
QuickDash" would return zero rows under exact match unless the user (or
Gemini) happened to type the exact suffixed name. I caught this building
the What-If template — wrote "at QuickDash" the way an actual user would,
traced it through `getForecast.ts`, and found it wouldn't resolve. This
wasn't a one-off: it's the same `.eq("retailer_name", ...)` pattern
copy-pasted across three tool files, so I fixed all three (and both
`.eq` calls inside `getForecast.ts` — the `v_promo_lift` query and the
`sales_facts` baseline join) to `.ilike("retailer_name", `%${arg}%`)`
instead of just rewording my own template to dodge it.

I also caught myself doing the exact same thing in Phase 3 — the
empty-state text I wrote then ("...at QuickDash") had this identical
latent bug; it's fixed now as a side effect of the tool-level fix, not
because I went back and edited that string.

## Verified

**Region-filtered whitespace** — ran the equivalent SQL directly:
`Urban Crisps` in `Gulf - Qatar` returns real, large gaps (22.9% vs. 61%
category average ACV at the worst retailer), confirming the fix produces
meaningful output, not empty results.

**Retailer substring matching** — simulated the fixed `getForecast` query
chain for "Bold Snacks" + "QuickDash": correctly resolves to real sales
data at both actual QuickDash locations in Bold Snacks' home region
(India - Metro) — `QuickDash (Metro)` and `QuickDash #2 (Metro)` — and
does not pull in QuickDash locations in regions where Bold Snacks has no
distribution (Gulf/SEA), because those combinations simply don't exist in
`sales_facts` regardless of how broad the retailer-name match is.

**Competitive Context template** — this one took two tries. My first pick
(`Urban Crisps`) checked out fine on data existing, but querying
`brand_relationships` for it directly showed **zero** competitor or
sibling edges — it's genuinely the only Salty Snacks brand in
Gulf - Qatar, a real finding, but a bad demo choice since it makes the
flagship "competitive context" tool return an empty competitor list.
Queried `brand_relationships` for brands with both sibling and competitor
edges, found `Coastal Little Ones` (1 sibling, 5 competitors), and
confirmed it also has recent notes across all three `signal_notes` types
(distribution gap, cannibalization risk, competitive pressure) — a
genuinely rich example, not just a non-empty one. Swapped the template to
use it.

**Build**: `npx tsc --noEmit` clean, `npm run build` compiles.

## Not verified here (same limitation as Phase 3)

Still no network path to `generativelanguage.googleapis.com` in this
sandbox, so I haven't seen these templates actually run through a live
Gemini call — only that the underlying tool functions return correct,
grounded data when queried directly and that everything type-checks and
builds. Worth clicking through all 6 templates once there's a real API key
in a networked environment, partly to confirm Gemini calls
`get_brand_context` alongside `get_brand_ranking`/`get_promo_lift_analysis`
as instructed in Phase 3's system prompt update, and partly to see
whether the retailer substring-match fix ever over-matches in practice
(e.g. a retailer name that's a substring of an unrelated one) — I checked
the one case this phase needed, not every retailer name pair in the
200-retailer set.

## Decisions I made that you may want to weigh in on

1. **`ilike` substring match (`%term%`) instead of prefix match
   (`term%`).** Substring is more forgiving (handles "Dash" matching
   "QuickDash" too) but has more theoretical over-match risk than prefix
   matching would. Given retailer names are chain-name + region-suffix,
   collisions seem unlikely, but I only checked the one pairing this phase
   actually needed — worth a broader look if this becomes a bigger part of
   the demo.
2. **Fixed the retailer-matching bug in three tool files rather than
   scoping it to just `getForecast.ts`.** It's the same bug in the same
   pattern, and leaving it broken in `getBrandRanking`/
   `getPromoLiftAnalysis` while fixing it only in the tool my new template
   happened to touch felt like leaving known debt in place for no reason.
   Flagging in case you'd rather these fixes land as an explicit separate
   change.

---

All 6 tools now have a real UI entry point, the whitespace template
actually demonstrates regional filtering, and the retailer-matching bug
that would have silently broken the What-If and Promo Lift templates
(and any real user typing a retailer name naturally) is fixed at the
source. Ready for Phase 5 (fixing the `getForecast.ts` promo-type-as-proxy
elasticity model — worth noting the What-If template added this phase
showcases a tool that Phase 5 hasn't upgraded yet, so its output is still
the known-simplified estimate) whenever you want to proceed.
