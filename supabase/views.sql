-- CPGist semantic layer
-- These views keep the agent's tool functions simple: each tool is close to
-- `select * from v_x where ...` rather than hand-rolled joins/window functions.
-- Run after schema.sql and after loading data.
--
-- Phase 1 rebuild notes:
--   - Every view now carries `region` (from retailers) so channel-mix and
--     whitespace tools can slice geographically, not just by channel.
--   - v_promo_lift now carries `discount_depth_pct` alongside `promo_type`,
--     so downstream elasticity work (Phase 5/6a) can key off actual price
--     cut depth rather than the promo_type categorical proxy.
--
-- Phase 5 rebuild notes:
--   - v_promo_lift now also carries `category` (from products), added at
--     the end of the select list (Postgres rejects CREATE OR REPLACE VIEW
--     that reorders/inserts existing columns) — lets getForecast.ts fit its
--     elasticity regression per category without a second join.
--
-- Phase 6 rebuild notes:
--   - Every view now carries `with (security_invoker = true)`. Without it, a
--     view runs with its OWNER's privileges (postgres, effectively a
--     superuser in a Supabase project) and completely bypasses row-level
--     security on the underlying tables — confirmed this empirically before
--     writing the fix: seeded a second org with a phantom brand+product+
--     sales row, queried v_channel_mix as an authenticated org-1 user, and
--     the org-2 phantom brand came back in the result set even though the
--     equivalent direct `select * from brands` correctly excluded it. This
--     is a real, serious RLS-bypass bug, not a theoretical one — every tool
--     in lib/tools/*.ts queries these views, so without this fix, Phase 6's
--     entire RLS layer would have been silently inert for every actual
--     agent query while looking correct on the underlying tables.
--   - Grants: views need their own `grant select ... to authenticated`
--     separate from the base tables' grants in schema.sql (confirmed this
--     too — querying a view with no grant on the view itself fails with
--     "permission denied for view", even when the caller has select on
--     every underlying table). Placed here since these views don't exist
--     yet when schema.sql runs.

-- ---------------------------------------------------------------------------
-- v_velocity: units sold per store per week, by product + retailer + week.
-- store count carrying the item = retailer.total_stores * (acv_distribution/100)
-- ---------------------------------------------------------------------------
create or replace view v_velocity with (security_invoker = true) as
select
  sf.product_id,
  p.name as product_name,
  p.brand_id,
  b.name as brand_name,
  sf.retailer_id,
  r.name as retailer_name,
  r.channel,
  r.region,
  sf.week_ending,
  sf.units,
  sf.acv_distribution,
  r.total_stores,
  case
    when coalesce(sf.acv_distribution, 0) > 0
      then sf.units / (r.total_stores * (sf.acv_distribution / 100.0))
    else null
  end as units_per_store_per_week
from sales_facts sf
join products p on p.id = sf.product_id
join brands b on b.id = p.brand_id
join retailers r on r.id = sf.retailer_id;

-- ---------------------------------------------------------------------------
-- v_promo_lift: % lift in units during promo weeks vs. the trailing 4-week
-- non-promo baseline immediately preceding each promo week, by product+retailer.
-- ---------------------------------------------------------------------------
create or replace view v_promo_lift with (security_invoker = true) as
with base as (
  select
    sf.id,
    sf.product_id,
    sf.retailer_id,
    sf.week_ending,
    sf.units,
    sf.on_promo,
    sf.promo_type,
    sf.discount_depth_pct,
    avg(case when not sf.on_promo then sf.units end) over (
      partition by sf.product_id, sf.retailer_id
      order by sf.week_ending
      rows between 4 preceding and 1 preceding
    ) as trailing_nonpromo_baseline_units
  from sales_facts sf
)
select
  b.product_id,
  p.name as product_name,
  p.brand_id,
  br.name as brand_name,
  b.retailer_id,
  r.name as retailer_name,
  r.channel,
  r.region,
  b.week_ending,
  b.promo_type,
  b.discount_depth_pct,
  b.units as promo_week_units,
  b.trailing_nonpromo_baseline_units,
  case
    when b.trailing_nonpromo_baseline_units > 0
      then round(((b.units - b.trailing_nonpromo_baseline_units) / b.trailing_nonpromo_baseline_units) * 100, 1)
    else null
  end as pct_lift,
  p.category
from base b
join products p on p.id = b.product_id
join brands br on br.id = p.brand_id
join retailers r on r.id = b.retailer_id
where b.on_promo = true;

-- ---------------------------------------------------------------------------
-- v_brand_share: brand $ sales as % of category $ sales, by week + retailer.
-- ---------------------------------------------------------------------------
create or replace view v_brand_share with (security_invoker = true) as
with brand_week as (
  select
    b.id as brand_id,
    b.name as brand_name,
    b.category,
    sf.retailer_id,
    sf.week_ending,
    sum(sf.dollar_sales) as brand_dollar_sales
  from sales_facts sf
  join products p on p.id = sf.product_id
  join brands b on b.id = p.brand_id
  group by b.id, b.name, b.category, sf.retailer_id, sf.week_ending
),
category_week as (
  select
    b.category,
    sf.retailer_id,
    sf.week_ending,
    sum(sf.dollar_sales) as category_dollar_sales
  from sales_facts sf
  join products p on p.id = sf.product_id
  join brands b on b.id = p.brand_id
  group by b.category, sf.retailer_id, sf.week_ending
)
select
  bw.brand_id,
  bw.brand_name,
  bw.category,
  bw.retailer_id,
  r.name as retailer_name,
  r.channel,
  r.region,
  bw.week_ending,
  bw.brand_dollar_sales,
  cw.category_dollar_sales,
  case
    when cw.category_dollar_sales > 0
      then round((bw.brand_dollar_sales / cw.category_dollar_sales) * 100, 2)
    else null
  end as brand_share_pct
from brand_week bw
join category_week cw
  on cw.category = bw.category
  and cw.retailer_id = bw.retailer_id
  and cw.week_ending = bw.week_ending
join retailers r on r.id = bw.retailer_id;

-- ---------------------------------------------------------------------------
-- v_distribution_gaps: latest ACV per product/retailer vs. the category
-- average ACV within the SAME REGION (not the global category average —
-- comparing a brand's ACV in Gulf retailers against a global average that's
-- dominated by North America rows would produce a meaningless gap), flagging
-- retailers where a product is meaningfully under-distributed.
-- Note: a brand's genuine absence from a region (Phase 1's home_regions
-- design) means it simply has no rows there at all, so it won't show up in
-- this view for that region — that's a distinct, stronger finding than a
-- distribution gap and is best surfaced by comparing brands.home_regions
-- against the full region list, not by this view.
-- ---------------------------------------------------------------------------
create or replace view v_distribution_gaps with (security_invoker = true) as
with latest_week as (
  select max(week_ending) as w from sales_facts
),
latest_acv as (
  select
    sf.product_id,
    sf.retailer_id,
    sf.acv_distribution
  from sales_facts sf, latest_week lw
  where sf.week_ending = lw.w
),
category_region_avg_acv as (
  select
    p.category,
    r.region,
    avg(sf.acv_distribution) as category_avg_acv
  from sales_facts sf
  join products p on p.id = sf.product_id
  join retailers r on r.id = sf.retailer_id
  join latest_week lw on sf.week_ending = lw.w
  group by p.category, r.region
)
select
  la.product_id,
  p.name as product_name,
  p.category,
  b.id as brand_id,
  b.name as brand_name,
  la.retailer_id,
  r.name as retailer_name,
  r.channel,
  r.region,
  la.acv_distribution as product_acv,
  cat.category_avg_acv,
  round(cat.category_avg_acv - la.acv_distribution, 1) as acv_gap_vs_category
from latest_acv la
join products p on p.id = la.product_id
join brands b on b.id = p.brand_id
join retailers r on r.id = la.retailer_id
join category_region_avg_acv cat on cat.category = p.category and cat.region = r.region
where la.acv_distribution < cat.category_avg_acv
order by acv_gap_vs_category desc;

-- ---------------------------------------------------------------------------
-- v_channel_mix: % of a brand's $ sales by retailer channel AND region
-- (all-time). Channel-only mix collapses e.g. "Quick Commerce in India" and
-- "Quick Commerce in SEA" into one row, which hides exactly the regional
-- story this product is meant to tell — so this is grouped by
-- (channel, region), with a companion channel-only rollup for callers that
-- just want the simpler cut.
-- ---------------------------------------------------------------------------
create or replace view v_channel_mix with (security_invoker = true) as
with brand_channel_region as (
  select
    b.id as brand_id,
    b.name as brand_name,
    r.channel,
    r.region,
    sum(sf.dollar_sales) as channel_region_dollar_sales
  from sales_facts sf
  join products p on p.id = sf.product_id
  join brands b on b.id = p.brand_id
  join retailers r on r.id = sf.retailer_id
  group by b.id, b.name, r.channel, r.region
),
brand_total as (
  select brand_id, sum(channel_region_dollar_sales) as total_dollar_sales
  from brand_channel_region
  group by brand_id
)
select
  bcr.brand_id,
  bcr.brand_name,
  bcr.channel,
  bcr.region,
  bcr.channel_region_dollar_sales,
  bt.total_dollar_sales,
  round((bcr.channel_region_dollar_sales / bt.total_dollar_sales) * 100, 1) as channel_mix_pct
from brand_channel_region bcr
join brand_total bt on bt.brand_id = bcr.brand_id
order by bcr.brand_id, channel_mix_pct desc;

-- ---------------------------------------------------------------------------
-- v_channel_mix_summary: same as v_channel_mix but rolled up to channel only
-- (no region split), for callers that want the simpler cut.
-- ---------------------------------------------------------------------------
create or replace view v_channel_mix_summary with (security_invoker = true) as
with brand_channel as (
  select
    b.id as brand_id,
    b.name as brand_name,
    r.channel,
    sum(sf.dollar_sales) as channel_dollar_sales
  from sales_facts sf
  join products p on p.id = sf.product_id
  join brands b on b.id = p.brand_id
  join retailers r on r.id = sf.retailer_id
  group by b.id, b.name, r.channel
),
brand_total as (
  select brand_id, sum(channel_dollar_sales) as total_dollar_sales
  from brand_channel
  group by brand_id
)
select
  bc.brand_id,
  bc.brand_name,
  bc.channel,
  bc.channel_dollar_sales,
  bt.total_dollar_sales,
  round((bc.channel_dollar_sales / bt.total_dollar_sales) * 100, 1) as channel_mix_pct
from brand_channel bc
join brand_total bt on bt.brand_id = bc.brand_id
order by bc.brand_id, channel_mix_pct desc;

-- Phase 6: views need their own grant (see header note above).
grant select on
  v_velocity, v_promo_lift, v_brand_share,
  v_distribution_gaps, v_channel_mix, v_channel_mix_summary
to authenticated;
