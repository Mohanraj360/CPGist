"""
Phase 7 — competitor_signals.

Generates competitor_signals.csv on top of Phase 1/2 data: the table Phase 2
deliberately deferred ("brand_relationships is structural, competitor_signals
will be event-based; different shapes, decided now so this schema doesn't
need revisiting when Phase 8 arrives" — see schema.sql's Phase 2 notes).

Same grounding discipline as Phase 2's signal_notes: every row comes from a
real pattern actually present in sales_facts, not invented.

  promo_launch  <- the first week of a new on_promo streak for a
                    product+retailer (previous week was NOT on promo, this
                    week is). magnitude_pct = discount_depth_pct that week.

brand_id is whichever brand took the action — "which of OUR brands should
care" is resolved at query time via brand_relationships
(relationship_type='competitor'), not stored redundantly here.

ONE SIGNAL TYPE ONLY, not the two originally planned (promo_launch +
distribution_gain/loss). See PHASE7_NOTES.md for the full writeup, but in
short: while building the distribution-shift detector, week-over-week
acv_distribution deltas came back with a ~22-point standard deviation (one
sampled product+retailer series jumped 50.8 -> 35.5 -> 53.3 -> 83.0 across
four consecutive weeks) — indistinguishable from noise, not the "slow
drift" generate_synthetic_data.py's own comment describes. Root cause:
`acv_start`/`acv_drift` in that script are drawn with `size=n` (n = every
product x retailer x week row in the whole dataset), not once per
product+retailer series — so every week gets an independently fresh random
draw instead of one persistent trend per series. There is no real
distribution trend in this dataset to detect; a "distribution_gain/loss"
signal built on it would be flagging noise as competitive intelligence.
`competitor_signals` schema (schema.sql) keeps distribution_gain/loss in
its signal_type check constraint for when this is fixed upstream, but this
generator only populates promo_launch, which doesn't touch acv_distribution
at all and isn't affected by this bug.
"""

import pandas as pd
import numpy as np

np.random.seed(11)

print("Loading Phase 1/2 data...")
brands = pd.read_csv("brands.csv")
retailers = pd.read_csv("retailers.csv")
products = pd.read_csv("products.csv")
sales = pd.read_csv("sales_facts.csv", parse_dates=["week_ending"])

pid_to_brand = dict(zip(products["id"], products["brand_id"]))
pid_to_category = dict(zip(products["id"], products["category"]))
sales["brand_id"] = sales["product_id"].map(pid_to_brand)
sales["category"] = sales["product_id"].map(pid_to_category)
retailer_region = dict(zip(retailers["id"], retailers["region"]))
sales["region"] = sales["retailer_id"].map(retailer_region)

brand_name = dict(zip(brands["id"], brands["name"]))
retailer_name = dict(zip(retailers["id"], retailers["name"]))

sales = sales.sort_values(["product_id", "retailer_id", "week_ending"])

# ---------------------------------------------------------------------------
# promo_launch: first week of a new on_promo streak per product+retailer.
# ---------------------------------------------------------------------------
print("Detecting promo_launch signals...")

sales["prev_on_promo"] = sales.groupby(["product_id", "retailer_id"])["on_promo"].shift(1)
launches = sales[(sales["on_promo"] == True) & (sales["prev_on_promo"] == False)]

# Cap per brand so a handful of high-promo-frequency brands don't dominate
# the table; sample recent-first for relevance.
launches = launches.sort_values("week_ending", ascending=False)
signal_rows = []
per_brand_count: dict[int, int] = {}
MAX_PER_BRAND = 20

for _, row in launches.iterrows():
    b = int(row["brand_id"])
    if per_brand_count.get(b, 0) >= MAX_PER_BRAND:
        continue
    per_brand_count[b] = per_brand_count.get(b, 0) + 1
    signal_rows.append({
        "brand_id": b,
        "category": row["category"],
        "retailer_id": int(row["retailer_id"]),
        "region": row["region"],
        "signal_date": row["week_ending"].date(),
        "signal_type": "promo_launch",
        "magnitude_pct": round(float(row["discount_depth_pct"]), 1),
        "description": (
            f"{brand_name.get(b, 'Brand')} launched a promo at "
            f"{retailer_name.get(int(row['retailer_id']), 'a retailer')} "
            f"the week of {row['week_ending'].date()} "
            f"({row['promo_type']}, {row['discount_depth_pct']:.0f}% depth)."
        ),
    })

print(f"  {len(signal_rows)} promo_launch signals "
      f"(capped at {MAX_PER_BRAND}/brand from {len(launches)} raw launch-weeks)")

signals_df = pd.DataFrame(signal_rows)
signals_df.insert(0, "id", range(1, len(signals_df) + 1))
signals_df["org_id"] = 1
signals_df.to_csv("competitor_signals.csv", index=False)

print(f"Wrote competitor_signals.csv: {len(signals_df)} rows total "
      f"(distribution_gain/distribution_loss intentionally not populated — "
      f"see the module docstring and PHASE7_NOTES.md)")
print("Done.")
