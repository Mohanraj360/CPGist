"""
Phase 2 — knowledge-graph-lite layer.

Generates two CSVs on top of the Phase 1 data:

  brand_relationships.csv
    Structural edges between brands: 'sibling' (shared parent_company) and
    'competitor' (same category, overlapping home_regions). Competitive-set
    membership is scoped by category + region overlap, not category alone
    — a brand only sold in Gulf General Trade doesn't meaningfully compete
    with one only sold in India Quick Commerce, even if they share a
    category. Edges are stored directed (both A->B and B->A) so a tool can
    query "give me brand X's context" with a single WHERE brand_id = X.

  signal_notes.csv
    Qualitative notes, but NOT free text invented independently of the
    data — every note is grounded in something actually present in the
    Phase 1 sales_facts / v_distribution_gaps output, the same principle
    Phase 1 used for the cross-SKU cannibalization signal. Three note
    types, each derived from a real pattern:
      - distribution_gap      <- v_distribution_gaps (regional ACV gap)
      - cannibalization_risk  <- sibling-SKU unit dips during promo weeks
      - competitive_pressure  <- overlapping promo weeks between
                                 competitor-edge brands in the same
                                 region/retailer

Both CSVs include org_id explicitly (Phase 1's CSVs omit it and rely on
the schema default, which breaks a plain `\\copy` without an explicit
column list — see PHASE2_NOTES.md). Doing it explicitly here avoids that
footgun for these two tables.
"""

import pandas as pd
import numpy as np

np.random.seed(7)

print("Loading Phase 1 data...")
brands = pd.read_csv("brands.csv")
retailers = pd.read_csv("retailers.csv")
products = pd.read_csv("products.csv")
sales = pd.read_csv("sales_facts.csv", parse_dates=["week_ending"])
gaps = pd.read_csv("distribution_gaps_export.csv")

pid_to_brand = dict(zip(products["id"], products["brand_id"]))
pid_to_category = dict(zip(products["id"], products["category"]))
sales["brand_id"] = sales["product_id"].map(pid_to_brand)
sales["category"] = sales["product_id"].map(pid_to_category)
retailer_region = dict(zip(retailers["id"], retailers["region"]))
sales["region"] = sales["retailer_id"].map(retailer_region)

brands["home_region_set"] = brands["home_regions"].fillna("").apply(
    lambda s: set(x for x in s.split("|") if x)
)

# ---------------------------------------------------------------------------
# brand_relationships
# ---------------------------------------------------------------------------
print("Building brand_relationships...")

rel_rows = []
by_category = brands.groupby("category")

for category, group in by_category:
    ids = group["id"].tolist()
    for i, a_id in enumerate(ids):
        a = group[group["id"] == a_id].iloc[0]
        for b_id in ids[i + 1:]:
            b = group[group["id"] == b_id].iloc[0]

            overlap = a["home_region_set"] & b["home_region_set"]

            is_sibling = (
                pd.notna(a["parent_company"])
                and a["parent_company"] == b["parent_company"]
            )

            if is_sibling:
                rel_type = "sibling"
                # Siblings still only matter for a given context if they
                # actually co-occur somewhere — keep the overlap field
                # even for siblings so downstream tools can filter by it.
            elif overlap:
                rel_type = "competitor"
            else:
                continue  # same category, zero region overlap -> not a
                          # meaningful relationship, skip (this is the
                          # scoping rule the plan called for)

            overlap_str = "|".join(sorted(overlap)) if overlap else ""

            for x_id, y_id in [(a_id, b_id), (b_id, a_id)]:
                rel_rows.append({
                    "brand_id": x_id,
                    "related_brand_id": y_id,
                    "relationship_type": rel_type,
                    "category": category,
                    "overlapping_regions": overlap_str,
                    "org_id": 1,
                })

rel_df = pd.DataFrame(rel_rows)
rel_df.insert(0, "id", range(1, len(rel_df) + 1))
rel_df.to_csv("brand_relationships.csv", index=False)
print(f"  {len(rel_df)} directed edges "
      f"({(rel_df.relationship_type == 'sibling').sum()} sibling, "
      f"{(rel_df.relationship_type == 'competitor').sum()} competitor)")

# ---------------------------------------------------------------------------
# signal_notes
# ---------------------------------------------------------------------------
print("Building signal_notes...")

note_rows = []
brand_name = dict(zip(brands["id"], brands["name"]))
retailer_name = dict(zip(retailers["id"], retailers["name"]))
retailer_channel = dict(zip(retailers["id"], retailers["channel"]))
last_week = sales["week_ending"].max()
window_start = last_week - pd.Timedelta(weeks=8)

# --- 1. distribution_gap notes ---------------------------------------------
# Take the single worst gap per (brand, region) so we get broad coverage
# instead of the same brand dominating every row (a brand can have many
# under-distributed retailers in a region; one note per region is enough
# to be a useful signal, not a flood).
gaps_sorted = gaps.sort_values("acv_gap_vs_category", ascending=False)
top_gaps = (
    gaps_sorted.groupby(["brand_id", "region"], as_index=False)
    .first()
)
# Keep only meaningfully large gaps (>10 pts) so these are real findings,
# not noise near the category average.
top_gaps = top_gaps[top_gaps["acv_gap_vs_category"] > 10].sort_values(
    "acv_gap_vs_category", ascending=False
).head(220)

for _, row in top_gaps.iterrows():
    note_rows.append({
        "brand_id": int(row["brand_id"]),
        "category": row["category"],
        "retailer_id": int(row["retailer_id"]),
        "region": row["region"],
        "date_start": (last_week - pd.Timedelta(weeks=1)).date(),
        "date_end": last_week.date(),
        "note_type": "distribution_gap",
        "note_text": (
            f"{row['brand_name']} is running {row['acv_gap_vs_category']:.0f} pts "
            f"below the {row['category']} category average ACV in {row['region']} "
            f"— worst at {row['retailer_name']} ({row['product_acv']:.0f}% vs "
            f"{row['category_avg_acv']:.0f}% category avg)."
        ),
        "org_id": 1,
    })

# --- 2. cannibalization_risk notes ------------------------------------------
# Reuse the same detection approach used to verify Phase 1: for each
# (brand, retailer, week) where >=1 SKU is on promo, check whether sibling
# SKUs took a meaningful unit dip vs. their own non-promo baseline at that
# retailer. Flag the biggest dips as notes, capped to a manageable count.
sales["is_promo_week_group"] = sales.groupby(
    ["brand_id", "retailer_id", "week_ending"]
)["on_promo"].transform("any")

baseline = (
    sales[sales["on_promo"] == False]
    .groupby(["product_id", "retailer_id"])["units"]
    .mean()
    .rename("baseline_units")
)

cann_candidates = sales[
    (sales["on_promo"] == False) & (sales["is_promo_week_group"])
].merge(baseline, on=["product_id", "retailer_id"], how="left")

cann_candidates = cann_candidates[cann_candidates["baseline_units"] > 0]
cann_candidates["dip_pct"] = (
    (cann_candidates["units"] - cann_candidates["baseline_units"])
    / cann_candidates["baseline_units"] * 100
)

# Meaningful dips only, most recent first, capped.
cann_top = cann_candidates[cann_candidates["dip_pct"] < -12].sort_values(
    "week_ending", ascending=False
).head(180)

for _, row in cann_top.iterrows():
    note_rows.append({
        "brand_id": int(row["brand_id"]),
        "category": row["category"],
        "retailer_id": int(row["retailer_id"]),
        "region": row["region"],
        "date_start": row["week_ending"].date(),
        "date_end": row["week_ending"].date(),
        "note_type": "cannibalization_risk",
        "note_text": (
            f"{brand_name.get(row['brand_id'], 'Brand')} SKU at "
            f"{retailer_name.get(row['retailer_id'], 'retailer')} dipped "
            f"{abs(row['dip_pct']):.0f}% vs its non-promo baseline the week of "
            f"{row['week_ending'].date()} while a sibling SKU was on promo — "
            f"likely in-portfolio cannibalization, not real category loss."
        ),
        "org_id": 1,
    })

# --- 3. competitive_pressure notes ------------------------------------------
# For a sample of competitor edges, check whether both brands had products
# on promo at the same retailer in the same recent week. That's a real,
# data-grounded co-occurrence, not an invented rivalry.
competitor_edges = rel_df[rel_df["relationship_type"] == "competitor"]
# Only need one direction to avoid duplicate notes for the same pair.
competitor_edges = competitor_edges[
    competitor_edges["brand_id"] < competitor_edges["related_brand_id"]
]

recent_promo = sales[
    (sales["on_promo"] == True) & (sales["week_ending"] >= window_start)
][["brand_id", "retailer_id", "week_ending", "region"]].drop_duplicates()

promo_by_brand_retailer_week = recent_promo.groupby(
    ["retailer_id", "week_ending"]
)["brand_id"].apply(set)

comp_notes_added = 0
for _, edge in competitor_edges.sample(
    frac=1, random_state=3
).iterrows():
    if comp_notes_added >= 150:
        break
    a_id, b_id = edge["brand_id"], edge["related_brand_id"]
    a_promo_weeks = recent_promo[recent_promo["brand_id"] == a_id]
    if a_promo_weeks.empty:
        continue
    for _, pw in a_promo_weeks.iterrows():
        both = promo_by_brand_retailer_week.get(
            (pw["retailer_id"], pw["week_ending"]), set()
        )
        if b_id in both:
            note_rows.append({
                "brand_id": int(a_id),
                "category": edge["category"],
                "retailer_id": int(pw["retailer_id"]),
                "region": pw["region"],
                "date_start": pw["week_ending"].date(),
                "date_end": pw["week_ending"].date(),
                "note_type": "competitive_pressure",
                "note_text": (
                    f"{brand_name.get(a_id, 'Brand')} and competitor "
                    f"{brand_name.get(b_id, 'Brand')} both ran promos at "
                    f"{retailer_name.get(pw['retailer_id'], 'retailer')} the "
                    f"week of {pw['week_ending'].date()} — any lift reading "
                    f"for either brand that week should account for the "
                    f"overlapping activity."
                ),
                "org_id": 1,
            })
            comp_notes_added += 1
            break  # one note per edge is enough

notes_df = pd.DataFrame(note_rows)
notes_df.insert(0, "id", range(1, len(notes_df) + 1))
notes_df.to_csv("signal_notes.csv", index=False)

print(f"  {len(notes_df)} signal notes "
      f"({(notes_df.note_type == 'distribution_gap').sum()} distribution_gap, "
      f"{(notes_df.note_type == 'cannibalization_risk').sum()} cannibalization_risk, "
      f"{(notes_df.note_type == 'competitive_pressure').sum()} competitive_pressure)")

print("Done.")
