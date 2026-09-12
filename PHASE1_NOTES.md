# Phase 1 rebuild notes

## What changed

**`scripts/generate_synthetic_data.py`** — fully rewritten, vectorized (pandas
merges + numpy array ops, no triple-nested loop):

- 110 brands across 10 categories, ~35% sitting under one of 15 shared
  parent companies.
- 200 retailers across 9 regions (North America as the Modern-Trade
  baseline, plus India Metro/Tier 2-3, Gulf UAE/Saudi/Qatar, SEA
  Malaysia/Philippines/Indonesia). Quick Commerce archetype retailers use
  fictional names (QuickDash, ZipCart, DashKart, etc.) — no Blinkit/Zepto/
  Instamart anywhere in the data itself; those names only ever appear in
  prose (README).
- 440 products (4 SKUs/brand).
- 1,515,488 sales_facts rows, weekly grain, 2 years. Verified end-to-end in
  a local Postgres 16 instance (schema + views actually load and query, not
  just eyeballed) — see size numbers below.
- Brand share within category follows a Zipf power law
  (`1 / rank^1.15`), not uniform noise.
- Each brand gets a genuine **home region set** (1-2 of 9 regions). Outside
  that set it has zero rows — real absence, not weak presence. Spot-checked:
  a brand with `home_regions = "India - Tier 2/3"` has literally no
  sales_facts rows anywhere else.
- `discount_depth_pct` added now (TPR 5-15%, Display 10-20%, Ad 15-25%,
  BOGO 45-50%), and promo lift scales with that depth rather than a flat
  random multiplier — this is real elasticity signal Phase 5 can regress on.
- Cross-SKU cannibalization: when a SKU runs a promo, sibling SKUs (same
  brand + category + retailer + week) take a -5% to -15% multiplier scaled
  with the promo's depth. Verified this shows up in the generated data.

**`supabase/schema.sql`** — added `region` to `retailers`; `parent_company` +
`home_regions` to `brands`; `discount_depth_pct` to `sales_facts`; nullable
`org_id` (default 1) to `brands`/`retailers`/`sales_facts` for Phase 5.

**`supabase/views.sql`** — added `region` to all five original views;
`discount_depth_pct` to `v_promo_lift`; changed `v_distribution_gaps` to
compare ACV against the **regional** category average (not global — a
global average dominated by North America rows would make Gulf/SEA gaps
meaningless); split `v_channel_mix` into a `(channel, region)` cut (the one
that actually tells the regional story) plus a new `v_channel_mix_summary`
for callers that just want the old channel-only rollup.

## Verified against a real Postgres instance, not just inspected

Installed Postgres 16 locally, loaded `schema.sql`, loaded all four CSVs,
ran `views.sql`, and queried each view:

| table/view | rows |
|---|---|
| brands | 110 |
| retailers | 200 |
| products | 440 |
| sales_facts | 1,515,488 |
| v_velocity | 1,515,488 |
| v_promo_lift | 265,359 |
| v_brand_share | 378,872 |
| v_distribution_gaps | 7,351 |
| v_channel_mix | 457 |
| v_channel_mix_summary | 340 |

All views return in under 3 seconds against this row count on a single
unoptimized local instance — Supabase's hosted Postgres with connection
pooling should be comparable or better.

Size estimate: **227–455MB** at 150–300 bytes/row including the three
`sales_facts` indexes — under Supabase's 500MB free-tier cap, with some
headroom. I got here by tuning brand home-region breadth (1-2 of 9 regions,
not 4-6 of 7) rather than cutting brand/retailer/product counts below the
100+/200+/multi-SKU targets in the brief.

## Decisions I made that you may want to weigh in on

1. **9 regions, not 7.** The brief didn't specify a region count. I split
   Gulf into UAE/Saudi/Qatar and SEA into Malaysia/Philippines/Indonesia
   (rather than 3 coarse regions) because that's what let me hit 200+
   retailers *and* stay under the 500MB cap — coarser regions meant more
   retailers per region, which meant more eligible (product, retailer)
   pairs than the row budget allows. Happy to consolidate back to fewer,
   larger regions if you'd rather trade some retailer count for that.
2. **Brand reach is narrow (1-2 of 9 regions)** rather than the 4-6 of 7
   the brief's phrasing suggested. This was the main lever for hitting the
   1-1.5M row target — same reasoning as above.
3. `category_share_weight` (the Zipf weight) isn't a DB column — it only
   exists in the generator to compute `base_units`. Didn't see a use for it
   downstream once the sales are baked in, but it's trivial to persist on
   `brands` if a future tool wants to reference "declared" market power
   directly instead of inferring it from `v_brand_share`.
4. I did not touch `README.md`, `lib/gemini-tools.ts`, or any `lib/tools/*`
   files yet — those are Phase 2+ (semantic layer / prompt updates) and
   Phase 9 (positioning). `get_channel_mix` and `get_distribution_whitespace`
   will need small updates to actually pass a `region` filter through once
   we get there, since the views now support it but the tool functions
   don't query it yet.

## Not yet done (by design — later phases)

- `brand_relationships`, `signal_notes`, `competitor_signals` tables (Phase 2/8)
- Wiring `region` into the actual tool functions / agent prompt (Phase 2/3)
- Everything else in the original rebuild prompt (Phases 2-9)

---

**Before I move to Phase 2**, let me know if the region/brand-reach
decisions above look right, or if you'd rather I adjust the row-count vs.
region-granularity tradeoff first.
