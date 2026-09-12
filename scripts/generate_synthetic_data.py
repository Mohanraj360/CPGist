"""
CPGist synthetic data generator (v2 — Phase 1 rebuild).

Generates synthetic (NOT real syndicated) CPG sales data at a scale that
supports genuinely interesting cross-brand / cross-region / cross-category
analysis, instead of a 5-brand toy set:

  - brands.csv        100+ brands, 10 categories, parent-company hierarchy
  - retailers.csv     200+ retailers, Modern Trade + Quick Commerce +
                       General Trade, spread across 7 regions
  - products.csv      ~4 SKUs per brand (pack sizes/variants)
  - sales_facts.csv   ~1.2M rows, weekly grain, 2 years

Design notes (see rebuild prompt Phase 1 for full rationale):
  - Retailer *names* are fictional even for the Quick Commerce archetype
    (no Blinkit/Zepto/Instamart in the data itself — those stay in prose,
    e.g. the README's "Blinkit-style Quick Commerce" framing).
  - Brand share within a category follows a Zipf power law, not uniform
    random noise.
  - Each brand has a "home region set" — it is genuinely ABSENT from
    regions outside that set, not just weaker there. This is what makes
    get_distribution_whitespace (regional) findable rather than trivial.
  - Promo weeks carry a numeric discount_depth_pct, and sibling SKUs
    (same brand+category+retailer+week) take a small negative multiplier
    when one of their siblings is on a deep promo — deliberate
    cross-SKU substitution signal for Phase 6a's cannibalization model.
  - Vectorized throughout: builds the full (product, retailer, week)
    frame with pandas merges + numpy array ops, no triple-nested loop.

Usage:
    pip install faker numpy pandas --break-system-packages
    python scripts/generate_synthetic_data.py

Then load the CSVs into Supabase via the table editor's CSV import, or the
Supabase Python client (see load_to_supabase() stub at the bottom).
"""

import numpy as np
import pandas as pd
from faker import Faker
from datetime import date, timedelta

fake = Faker()
Faker.seed(42)
rng = np.random.default_rng(42)

OUT_DIR = "scripts"

# ---------------------------------------------------------------------------
# 0. Regions & channels
# ---------------------------------------------------------------------------
# The regional split is the whole differentiator vs. a US-only Modern Trade
# tool, so it drives both retailer generation and brand presence below.
REGIONS = [
    "North America",       # Modern Trade baseline, for contrast
    "India - Metro",
    "India - Tier 2/3",
    "Gulf - UAE",
    "Gulf - Saudi",
    "Gulf - Qatar",
    "SEA - Malaysia",
    "SEA - Philippines",
    "SEA - Indonesia",
]

# Which channels exist in which region, and roughly how many retailers of
# that channel to generate there. Quick Commerce and General Trade are
# concentrated in India/Gulf/SEA on purpose; North America is Modern-Trade-only.
# Nine (fairly granular) regions rather than a handful of big ones: this
# keeps total retailer count at 200+ while keeping any single brand's
# reach (1-2 home regions) a small slice of the whole map, which is what
# keeps sales_facts near the ~1-1.5M row target at 100+ brands.
REGION_CHANNEL_COUNTS = {
    "North America":     {"Grocery": 13, "Club": 5,  "Natural": 6,  "C-Store": 11},
    "India - Metro":     {"Grocery": 6,  "C-Store": 4, "Quick Commerce": 11, "General Trade": 8},
    "India - Tier 2/3":  {"Grocery": 8,  "General Trade": 17},
    "Gulf - UAE":        {"Grocery": 7,  "Club": 3,  "Quick Commerce": 7, "General Trade": 5},
    "Gulf - Saudi":      {"Grocery": 6,  "General Trade": 9},
    "Gulf - Qatar":      {"Grocery": 5,  "Quick Commerce": 5, "General Trade": 5},
    "SEA - Malaysia":    {"Grocery": 6,  "Quick Commerce": 6, "General Trade": 8},
    "SEA - Philippines": {"Grocery": 6,  "Quick Commerce": 5, "General Trade": 8},
    "SEA - Indonesia":   {"Grocery": 6,  "Quick Commerce": 6, "General Trade": 8},
}

# Which categories a channel plausibly carries.
CHANNEL_CATEGORY_FIT = {
    "Grocery":         "all",
    "Club":            {"Salty Snacks", "Sparkling Water", "Packaged Foods", "Beverages",
                         "Home Care", "Breakfast & Cereal"},
    "Natural":         {"Salty Snacks", "Sparkling Water", "Personal Care", "Packaged Foods",
                         "Beverages", "Dairy"},
    "C-Store":         {"Salty Snacks", "Sparkling Water", "Beverages", "Confectionery"},
    "Quick Commerce":  "all",
    "General Trade":   "all",
}

CATEGORIES = [
    "Salty Snacks", "Sparkling Water", "Personal Care", "Packaged Foods",
    "Beverages", "Home Care", "Dairy", "Confectionery",
    "Breakfast & Cereal", "Baby Care",
]

# ---------------------------------------------------------------------------
# 1. Retailers — fictional names, 7 regions, ~200 total
# ---------------------------------------------------------------------------
QC_NAME_POOL = ["QuickDash", "ZipCart", "DashKart", "SwiftBasket", "HopMart",
                "FlashCart", "NimbleMart", "RapidBasket", "GoCart Express", "DartMart"]
GT_NAME_POOL = ["Local Trade Collective", "ValueTrade GT", "Neighborhood Wholesale",
                "Corner Store Network", "Community Retail Co-op", "Bazaar Wholesale",
                "MarketLink GT", "Sundry Traders Network"]
MT_GROCERY_POOL = ["FreshMart", "MetroBazaar", "GreenAisle", "PrimeGrocer", "DailyBasket",
                    "SunriseMart", "UrbanPantry", "ValueGrocer", "CityMart", "HomeFresh"]
CLUB_POOL = ["SaverClub", "BulkBasket Club", "WareClub", "MegaValue Club"]
NATURAL_POOL = ["GreenLeaf Naturals", "PureRoots Market", "EarthAisle", "NaturaLife Market"]
CSTORE_POOL = ["QuickStop", "CornerFuel Mart", "GoStop", "ExpressStop"]

NAME_POOLS = {
    "Quick Commerce": QC_NAME_POOL,
    "General Trade": GT_NAME_POOL,
    "Grocery": MT_GROCERY_POOL,
    "Club": CLUB_POOL,
    "Natural": NATURAL_POOL,
    "C-Store": CSTORE_POOL,
}

retailer_rows = []
rid = 1
for region, channel_counts in REGION_CHANNEL_COUNTS.items():
    for channel, count in channel_counts.items():
        pool = NAME_POOLS[channel]
        for i in range(count):
            base_name = pool[i % len(pool)]
            suffix = f" #{i // len(pool) + 1}" if i >= len(pool) else ""
            region_tag = region.split(" - ")[-1] if " - " in region else ""
            name = f"{base_name}{suffix} ({region_tag})" if region_tag else f"{base_name}{suffix}"
            if channel == "General Trade":
                total_stores = int(rng.integers(1500, 6000))
            elif channel == "Quick Commerce":
                total_stores = int(rng.integers(150, 900))
            elif channel == "C-Store":
                total_stores = int(rng.integers(500, 1800))
            else:
                total_stores = int(rng.integers(80, 1000))
            retailer_rows.append({
                "id": rid, "name": name, "channel": channel,
                "region": region, "total_stores": total_stores,
            })
            rid += 1

retailers = pd.DataFrame(retailer_rows)
retailers.to_csv(f"{OUT_DIR}/retailers.csv", index=False)
N_RETAILERS = len(retailers)

# ---------------------------------------------------------------------------
# 2. Brands — 100+ across 10 categories, parent-company hierarchy,
#    Zipf share weight per category, and a home-region presence set.
# ---------------------------------------------------------------------------
BRANDS_PER_CATEGORY = 11  # -> ~110 brands total
adjectives = ["Crunch", "Pure", "Golden", "Nomad", "Sunrise", "Bold", "Fresh", "True",
              "Prime", "Silver", "Blue", "Meadow", "Coastal", "Urban", "Heritage",
              "Vivid", "Everyday", "Royal", "Cloud", "Spring"]
nouns_by_cat = {
    "Salty Snacks": ["Bites", "Crisps", "Chips", "Snacks"],
    "Sparkling Water": ["Fizz", "Springs", "Bubbles", "Water Co"],
    "Personal Care": ["Care", "Glow", "Essentials", "Skin"],
    "Packaged Foods": ["Kitchen", "Foods", "Table", "Pantry"],
    "Beverages": ["Drinks", "Refresh", "Beverages", "Sip"],
    "Home Care": ["Home", "Clean", "Household", "Shine"],
    "Dairy": ["Dairy", "Creamery", "Farms", "Milk Co"],
    "Confectionery": ["Sweets", "Candy Co", "Treats", "Confections"],
    "Breakfast & Cereal": ["Mornings", "Cereal Co", "Breakfast Co", "Grains"],
    "Baby Care": ["Baby Co", "Little Ones", "Tiny Care", "Baby Essentials"],
}

# Parent companies: roughly 1 in 3 brands belongs to a multi-brand portfolio.
PARENT_COMPANIES = [f"{n} Holdings" for n in
                     ["Meridian", "Alderbrook", "Solace", "Kestrel", "Northbridge",
                      "Cardinal", "Larkspur", "Union Point", "Fernway", "Highfield",
                      "Wrenfield", "Bellcrest", "Marrow", "Ashford", "Talcott"]]

brand_rows = []
bid = 1
for cat in CATEGORIES:
    used_names = set()
    for i in range(BRANDS_PER_CATEGORY):
        name = None
        for _ in range(50):
            candidate = f"{rng.choice(adjectives)} {rng.choice(nouns_by_cat[cat])}"
            if candidate not in used_names:
                used_names.add(candidate)
                name = candidate
                break
        if name is None:
            name = f"{rng.choice(adjectives)} {rng.choice(nouns_by_cat[cat])} {bid}"
        # ~35% chance a brand sits under a shared parent company
        parent = rng.choice(PARENT_COMPANIES) if rng.random() < 0.35 else None
        # Home region set: every brand gets 2-6 of the 7 regions, biased so
        # some brands are India/Gulf/SEA-only (no North America presence at
        # all) and some are North-America-heavy legacy brands absent from
        # Quick Commerce-heavy regions. This is what makes regional
        # whitespace genuinely findable rather than "present everywhere."
        # Deliberately tight: 2-3 of the 7 regions (not 4-6), so a brand's
        # absence elsewhere is the norm rather than the exception. This is
        # what keeps sales_facts near the ~1-1.5M row target at this brand
        # count and makes regional whitespace genuinely sparse, not
        # "present most places, missing a corner."
        n_regions = int(rng.integers(1, 3))
        archetype = rng.random()
        if archetype < 0.3:
            # APAC/Gulf-native brand, no North America presence
            pool = [r for r in REGIONS if r != "North America"]
            home_regions = list(rng.choice(pool, size=min(n_regions, len(pool)), replace=False))
        elif archetype < 0.5:
            # Legacy North America brand, not yet expanded to Quick Commerce regions
            pool = ["North America", "India - Tier 2/3", "Gulf - Saudi"]
            home_regions = list(rng.choice(pool, size=min(n_regions, len(pool)), replace=False))
        else:
            home_regions = list(rng.choice(REGIONS, size=n_regions, replace=False))

        brand_rows.append({
            "id": bid, "name": name, "category": cat, "parent_company": parent,
            "home_regions": "|".join(sorted(home_regions)),
            "zipf_rank": i + 1,  # rank within category, used for Zipf share weight below
        })
        bid += 1

brands = pd.DataFrame(brand_rows)
# Zipf-distributed share weight within each category: rank 1 brand dominates,
# long tail of smaller brands — replaces flat uniform base_units scaling.
brands["category_share_weight"] = 1.0 / (brands["zipf_rank"] ** 1.15)
BRANDS_SCHEMA_COLS = ["id", "name", "category", "parent_company", "home_regions"]
brands[BRANDS_SCHEMA_COLS].to_csv(f"{OUT_DIR}/brands.csv", index=False)
N_BRANDS = len(brands)

# ---------------------------------------------------------------------------
# 3. Products — ~4 SKUs (pack sizes/variants) per brand
# ---------------------------------------------------------------------------
SUBCATS = {
    "Salty Snacks": ["Tortilla Chips", "Potato Chips", "Pretzels", "Popcorn"],
    "Sparkling Water": ["Lime", "Berry", "Plain", "Citrus"],
    "Personal Care": ["Shampoo", "Body Wash", "Deodorant", "Lotion"],
    "Packaged Foods": ["Pasta", "Sauces", "Ready Meals", "Soups"],
    "Beverages": ["Cola", "Juice", "Energy Drink", "Iced Tea"],
    "Home Care": ["Dish Soap", "Surface Cleaner", "Laundry Detergent", "Air Freshener"],
    "Dairy": ["Yogurt", "Milk", "Cheese", "Butter"],
    "Confectionery": ["Chocolate Bar", "Gummies", "Hard Candy", "Mints"],
    "Breakfast & Cereal": ["Flakes", "Granola", "Oats", "Muesli"],
    "Baby Care": ["Diapers", "Wipes", "Baby Wash", "Baby Food"],
}
SIZES = {
    "Salty Snacks": ["150g", "200g", "300g", "Family Pack"],
    "Sparkling Water": ["330ml", "500ml", "1L", "6-pack"],
    "Personal Care": ["100ml", "200ml", "400ml", "Travel Size"],
    "Packaged Foods": ["250g", "500g", "1kg", "Family Pack"],
    "Beverages": ["330ml Can", "500ml Bottle", "1L", "6-pack"],
    "Home Care": ["500ml", "1L", "2L", "Refill Pack"],
    "Dairy": ["200g", "500g", "1L", "1kg"],
    "Confectionery": ["Single Bar", "Share Pack", "50g", "100g"],
    "Breakfast & Cereal": ["375g", "500g", "1kg", "Family Pack"],
    "Baby Care": ["Small Pack", "Medium Pack", "Jumbo Pack", "Value Pack"],
}
SKUS_PER_BRAND = 4

product_rows = []
pid = 1
for brand in brand_rows:
    subcats = SUBCATS[brand["category"]]
    sizes = SIZES[brand["category"]]
    for i in range(SKUS_PER_BRAND):
        product_rows.append({
            "id": pid, "brand_id": brand["id"],
            "name": f"{brand['name']} {subcats[i % len(subcats)]}",
            "category": brand["category"],
            "subcategory": subcats[i % len(subcats)],
            "size": sizes[i % len(sizes)],
        })
        pid += 1

products_df = pd.DataFrame(product_rows)
products_df.to_csv(f"{OUT_DIR}/products.csv", index=False)
N_PRODUCTS = len(products_df)

# ---------------------------------------------------------------------------
# 4. Eligibility: (product, retailer) pairs where the retailer's channel
#    plausibly carries the category AND the retailer's region is in the
#    brand's home region set.
# ---------------------------------------------------------------------------
products_df = products_df.merge(
    brands[["id", "home_regions", "category_share_weight", "parent_company"]]
    .rename(columns={"id": "brand_id"}),
    on="brand_id", how="left",
)
products_df["home_region_set"] = products_df["home_regions"].str.split("|")

# Cross join products x retailers (bounded: 440 x 200 ~= 88K pairs, cheap),
# then filter down to eligible pairs before expanding to weeks.
products_df["_k"] = 1
retailers["_k"] = 1
pairs = products_df.merge(retailers, on="_k", suffixes=("", "_ret"))
pairs.drop(columns=["_k"], inplace=True)

def channel_fits(row):
    fit = CHANNEL_CATEGORY_FIT[row["channel"]]
    return fit == "all" or row["category"] in fit

pairs["channel_ok"] = pairs.apply(channel_fits, axis=1)
pairs["region_ok"] = pairs.apply(lambda r: r["region"] in r["home_region_set"], axis=1)
eligible = pairs[pairs["channel_ok"] & pairs["region_ok"]].reset_index(drop=True)
eligible = eligible.rename(columns={"id": "product_id", "id_ret": "retailer_id"})

N_PAIRS = len(eligible)
N_WEEKS = 104
EST_ROWS = N_PAIRS * N_WEEKS
EST_BYTES_LOW, EST_BYTES_HIGH = 150, 300
est_low_mb = EST_ROWS * EST_BYTES_LOW / 1_000_000
est_high_mb = EST_ROWS * EST_BYTES_HIGH / 1_000_000

print("--- Pre-generation size estimate ---")
print(f"  brands:            {N_BRANDS}")
print(f"  retailers:         {N_RETAILERS}")
print(f"  products:          {N_PRODUCTS}")
print(f"  eligible pairs:    {N_PAIRS}  (product x retailer combos that will get weekly rows)")
print(f"  weeks:             {N_WEEKS}")
print(f"  estimated rows:    {EST_ROWS:,}")
print(f"  estimated size:    {est_low_mb:,.0f}MB - {est_high_mb:,.0f}MB "
      f"(at ~{EST_BYTES_LOW}-{EST_BYTES_HIGH} bytes/row incl. 3 indexes)")
if est_high_mb > 500:
    print("  WARNING: high estimate exceeds Supabase free-tier 500MB cap. "
          "Reduce BRANDS_PER_CATEGORY / SKUS_PER_BRAND / N_WEEKS before proceeding.")
print("-------------------------------------")

# ---------------------------------------------------------------------------
# 5. Expand eligible pairs across weeks (vectorized) and compute sales.
# ---------------------------------------------------------------------------
start_monday = date(2024, 1, 1) - timedelta(days=date(2024, 1, 1).weekday())
week_endings = np.array([start_monday + timedelta(weeks=w, days=6) for w in range(N_WEEKS)])
week_idx = np.arange(N_WEEKS)

eligible["_k"] = 1
weeks_df = pd.DataFrame({"_k": 1, "week_idx": week_idx})
sales = eligible.merge(weeks_df, on="_k").drop(columns=["_k"])
sales["week_ending"] = week_endings[sales["week_idx"].values]
n = len(sales)
print(f"Expanding to {n:,} (product x retailer x week) rows...")

t = sales["week_idx"].values / N_WEEKS  # 0 -> 1 over the window

# --- base units: power-law brand share x retailer size, vectorized ---
base_units = (
    sales["category_share_weight"].values * 900.0
    * (sales["total_stores"].values / 500.0)
    * rng.uniform(0.7, 1.3, size=n)
)

# --- brand trend: deterministic per-brand pseudo-random trend from brand id ---
rng_trend = np.random.default_rng(7)
brand_trend_map = pd.Series(
    rng_trend.uniform(-0.15, 0.25, size=N_BRANDS), index=brands["id"].values
)
trend_per_row = sales["brand_id"].map(brand_trend_map).values
trend_mult = 1 + trend_per_row * t

# --- seasonality by category ---
months = pd.to_datetime(sales["week_ending"]).dt.month.values
peak_months_by_cat = {
    "Salty Snacks": {10, 11, 12, 1}, "Sparkling Water": {4, 5, 6, 7},
    "Beverages": {4, 5, 6, 7}, "Confectionery": {10, 11, 12},
    "Baby Care": set(), "Personal Care": set(), "Home Care": set(),
    "Dairy": set(), "Packaged Foods": set(), "Breakfast & Cereal": {1, 2},
}
seasonal_mult = np.ones(n)
for cat, peak_months in peak_months_by_cat.items():
    if not peak_months:
        continue
    mask = (sales["category"].values == cat) & np.isin(months, list(peak_months))
    seasonal_mult[mask] = 1.3

# --- promo: ~15-20% of weeks; promo_type drives discount_depth_pct ---
on_promo = rng.random(n) < rng.uniform(0.15, 0.20, size=n)
promo_type = np.full(n, None, dtype=object)
discount_depth_pct = np.zeros(n)
promo_idx = np.where(on_promo)[0]
n_promo = len(promo_idx)
ptype_choices = rng.choice(
    ["TPR", "Display", "BOGO", "Ad"], size=n_promo, p=[0.4, 0.25, 0.15, 0.2]
)
promo_type[promo_idx] = ptype_choices
depth_ranges = {"TPR": (5, 15), "Display": (10, 20), "Ad": (15, 25), "BOGO": (45, 50)}
depths = np.zeros(n_promo)
for ptype, (lo, hi) in depth_ranges.items():
    mask = ptype_choices == ptype
    depths[mask] = rng.uniform(lo, hi, size=mask.sum())
discount_depth_pct[promo_idx] = depths

# promo lift scales with discount depth rather than a flat random multiplier
promo_mult = np.ones(n)
promo_mult[promo_idx] = 1 + (depths / 100.0) * rng.uniform(3.5, 5.5, size=n_promo)

noise = rng.normal(1.0, 0.08, size=n)
units = np.clip(base_units * trend_mult * seasonal_mult * promo_mult * noise, 0, None)

# --- ACV distribution: slow drift (regional absence is already handled
#     upstream by the eligibility filter, so a brand simply has no rows
#     at all in retailers outside its home region set) ---
acv_start = rng.uniform(35, 85, size=n)
acv_drift = rng.uniform(-15, 20, size=n)
acv = np.clip(acv_start + acv_drift * t + rng.normal(0, 1.5, size=n), 5, 100)

price_base = {
    "Salty Snacks": (2.5, 6.5), "Sparkling Water": (1.0, 3.5), "Personal Care": (3.0, 9.0),
    "Packaged Foods": (2.0, 7.0), "Beverages": (1.2, 4.0), "Home Care": (2.5, 8.0),
    "Dairy": (1.5, 5.0), "Confectionery": (1.0, 4.0), "Breakfast & Cereal": (2.5, 6.0),
    "Baby Care": (4.0, 12.0),
}
lo_arr = sales["category"].map(lambda c: price_base[c][0]).values
hi_arr = sales["category"].map(lambda c: price_base[c][1]).values
base_price = rng.uniform(lo_arr, hi_arr)
price = base_price * (1 - discount_depth_pct / 100.0 * on_promo)
dollar_sales = units * price

sales["units"] = units.round(1)
sales["dollar_sales"] = dollar_sales.round(2)
sales["acv_distribution"] = acv.round(1)
sales["on_promo"] = on_promo
sales["promo_type"] = promo_type
sales["discount_depth_pct"] = discount_depth_pct.round(1)

# ---------------------------------------------------------------------------
# 6. Cross-SKU substitution signal (groundwork for Phase 6a cannibalization).
#    When a SKU runs a deep promo, sibling SKUs of the same brand, in the
#    same category, at the same retailer and week, take a small negative
#    multiplier scaled with promo depth (roughly -5% to -15%).
# ---------------------------------------------------------------------------
group_cols = ["brand_id", "category", "retailer_id", "week_idx"]
promo_depth_or_zero = sales["discount_depth_pct"].where(sales["on_promo"], 0)
group_max_depth = promo_depth_or_zero.groupby(
    [sales[c] for c in group_cols]
).transform("max")
sibling_mask = (~sales["on_promo"].values) & (group_max_depth.values > 0)
cannib_pct = np.clip(group_max_depth.values / 100.0 * 0.6, 0.05, 0.15)
sales.loc[sibling_mask, "units"] = (
    sales.loc[sibling_mask, "units"] * (1 - cannib_pct[sibling_mask])
).round(1)
sales.loc[sibling_mask, "dollar_sales"] = (
    sales.loc[sibling_mask, "units"] * price[sibling_mask]
).round(2)

sales = sales.reset_index(drop=True)
sales.insert(0, "id", np.arange(1, len(sales) + 1))
out_cols = ["id", "product_id", "retailer_id", "week_ending", "dollar_sales", "units",
            "acv_distribution", "on_promo", "promo_type", "discount_depth_pct"]
sales_df = sales[out_cols]
sales_df.to_csv(f"{OUT_DIR}/sales_facts.csv", index=False)

print("--- Generated ---")
print(f"  brands.csv          {N_BRANDS} rows")
print(f"  retailers.csv       {N_RETAILERS} rows")
print(f"  products.csv        {N_PRODUCTS} rows")
print(f"  sales_facts.csv     {len(sales_df):,} rows")


# ---------------------------------------------------------------------------
# Optional: load directly into Supabase instead of CSV-importing by hand.
# Requires: pip install supabase --break-system-packages
# and SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars set.
# ---------------------------------------------------------------------------
def load_to_supabase():
    import os
    from supabase import create_client

    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # service role, not anon, for bulk insert
    sb = create_client(url, key)

    def bulk_insert(table, df, batch_size=1000):
        records = df.to_dict("records")
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            sb.table(table).insert(batch).execute()
            print(f"  inserted {table} {i + len(batch)}/{len(records)}")

    bulk_insert("brands", brands[BRANDS_SCHEMA_COLS])
    bulk_insert("retailers", retailers[["id", "name", "channel", "region", "total_stores"]])
    bulk_insert("products", products_df[["id", "brand_id", "name", "category", "subcategory", "size"]])
    bulk_insert("sales_facts", sales_df.drop(columns=["id"]))  # let serial PK assign


if __name__ == "__main__":
    # Uncomment to load straight into Supabase after generating CSVs:
    # load_to_supabase()
    pass
