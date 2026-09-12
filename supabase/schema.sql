-- CPGist core schema
-- Run in Supabase SQL editor (or via `supabase db push` with a migration).
--
-- Phase 1 rebuild notes:
--   - `region` added to retailers: the India/Gulf/APAC channel differentiator
--     is meaningless without a geography to slice it by.
--   - `parent_company` / `home_regions` added to brands: portfolio hierarchy
--     and genuine regional absence (not just weaker presence), which is what
--     makes get_distribution_whitespace interesting at the new data scale.
--   - `discount_depth_pct` added to sales_facts now (not deferred to a later
--     phase) so Phase 5's elasticity model can regress on actual price-delta
--     instead of a promo_type categorical proxy, without a second migration.
--   - `org_id` added now, nullable with a default, on brands/retailers/
--     sales_facts. Nothing enforces it yet — Phase 5 wires Supabase Auth +
--     RLS scoped by it — but adding the column during this schema touch
--     avoids a second migration pass later.

create table if not exists brands (
  id serial primary key,
  name text not null,
  category text not null,
  parent_company text, -- null = independent brand, not part of a multi-brand portfolio
  home_regions text,    -- pipe-delimited region list, e.g. 'Gulf - UAE|SEA - Malaysia'
                        -- (regions NOT listed here are genuine absence, not weak presence)
  org_id int default 1
);

create table if not exists retailers (
  id serial primary key,
  name text not null,
  channel text not null, -- 'Grocery', 'Club', 'Natural', 'C-Store', 'Quick Commerce', 'General Trade'
  region text not null,  -- e.g. 'North America', 'India - Metro', 'Gulf - UAE', 'SEA - Malaysia'
  total_stores int not null default 100, -- store count universe, used for velocity (units/store/week)
  org_id int default 1
);

create table if not exists products (
  id serial primary key,
  brand_id int references brands(id) on delete cascade,
  name text not null,
  category text not null,
  subcategory text,
  size text,
  org_id int default 1
);

create table if not exists sales_facts (
  id serial primary key,
  product_id int references products(id) on delete cascade,
  retailer_id int references retailers(id) on delete cascade,
  week_ending date not null,
  dollar_sales numeric not null,
  units numeric not null,
  acv_distribution numeric, -- % of stores carrying the item (0-100)
  on_promo boolean default false,
  promo_type text, -- 'TPR', 'Display', 'BOGO', 'Ad', null
  discount_depth_pct numeric default 0, -- numeric price-cut depth, 0 when not on promo
  org_id int default 1
);

create index if not exists idx_sales_product_week on sales_facts (product_id, week_ending);
create index if not exists idx_sales_retailer_week on sales_facts (retailer_id, week_ending);
create index if not exists idx_sales_promo on sales_facts (on_promo);
create index if not exists idx_brands_category on brands (category);
create index if not exists idx_retailers_region_channel on retailers (region, channel);

-- Phase 2 rebuild notes:
--   - brand_relationships: structural edges (sibling = shared parent_company,
--     competitor = same category AND overlapping home_regions). Scoped by
--     category + region overlap, not category alone, since a brand only
--     sold in Gulf General Trade doesn't meaningfully compete with one only
--     sold in India Quick Commerce even if they share a category. Stored
--     directed (both A->B and B->A) so a tool can query a single brand_id.
--   - signal_notes: qualitative notes, each grounded in a real pattern in
--     sales_facts / v_distribution_gaps (regional ACV gaps, sibling-SKU
--     cannibalization dips, overlapping competitor promo weeks) — not
--     free text invented independently of the data. Join key is
--     (brand_id, category, retailer_id, region, date_start/date_end) so
--     lib/gemini-tools.ts can filter to what's relevant to a given call.
--   - Kept as two separate tables from Phase 8's future competitor_signals
--     (time-stamped competitor events like price changes/launches) —
--     brand_relationships is structural, competitor_signals will be
--     event-based; different shapes, decided now so this schema doesn't
--     need revisiting when Phase 8 arrives.

create table if not exists brand_relationships (
  id serial primary key,
  brand_id int references brands(id) on delete cascade,
  related_brand_id int references brands(id) on delete cascade,
  relationship_type text check (relationship_type in ('sibling', 'competitor')) not null,
  category text not null,
  overlapping_regions text, -- pipe-delimited; empty string for siblings with no region overlap
  org_id int default 1
);

create index if not exists idx_brand_relationships_brand on brand_relationships (brand_id);
create index if not exists idx_brand_relationships_type on brand_relationships (relationship_type);

create table if not exists signal_notes (
  id serial primary key,
  brand_id int references brands(id) on delete cascade,
  category text not null,
  retailer_id int references retailers(id), -- nullable: some notes are brand/category-level, not retailer-specific
  region text,                                -- nullable, same reason
  date_start date not null,
  date_end date not null,
  note_type text check (note_type in ('distribution_gap', 'cannibalization_risk', 'competitive_pressure')) not null,
  note_text text not null,
  org_id int default 1
);

create index if not exists idx_signal_notes_brand on signal_notes (brand_id);
create index if not exists idx_signal_notes_dates on signal_notes (date_start, date_end);
create index if not exists idx_signal_notes_type on signal_notes (note_type);

-- Phase 7 rebuild notes:
--   - competitor_signals: the table Phase 2 deliberately deferred ("Kept as
--     two separate tables from Phase 8's future competitor_signals... —
--     brand_relationships is structural, competitor_signals will be
--     event-based"). Stores brand_id = the brand that took the action;
--     "which of our brands should care" is resolved at query time via
--     brand_relationships (relationship_type='competitor'), not a second
--     denormalized FK here — brand_relationships already stores that edge.
--   - Same grounding discipline as signal_notes: every row is derived from
--     a real pattern in sales_facts, not invented. Schema allows three
--     signal_types (promo_launch, distribution_gain, distribution_loss),
--     but scripts/generate_phase7_data.py currently only populates
--     promo_launch — the distribution-based pair was dropped after
--     discovering generate_synthetic_data.py's acv_distribution field is
--     effectively noise (a real bug in the Phase 1 generator, not this
--     phase's code — see PHASE7_NOTES.md). The constraint keeps the shape
--     ready for when that's fixed upstream rather than needing a second
--     migration.
create table if not exists competitor_signals (
  id serial primary key,
  brand_id int references brands(id) on delete cascade, -- which brand took this action
  category text not null,
  retailer_id int references retailers(id),
  region text,
  signal_date date not null,
  signal_type text check (signal_type in ('promo_launch', 'distribution_gain', 'distribution_loss')) not null,
  magnitude_pct numeric, -- discount depth % for promo_launch; ACV point swing for distribution_gain/loss
  description text not null,
  org_id int default 1
);

create index if not exists idx_competitor_signals_brand on competitor_signals (brand_id);
create index if not exists idx_competitor_signals_date on competitor_signals (signal_date);
create index if not exists idx_competitor_signals_type on competitor_signals (signal_type);

create table if not exists insight_feedback (
  id serial primary key,
  insight_summary text,
  outcome text check (outcome in ('worked', 'didnt_work', 'unknown')),
  created_at timestamp default now(),
  org_id int default 1
);

-- Phase 6 rebuild notes:
--   - `org_id` existed on brands/retailers/sales_facts since Phase 1 and on
--     brand_relationships/signal_notes since Phase 2, but was unenforced —
--     nothing actually restricted a query to one org. This phase wires real
--     multi-tenancy: `orgs` + `profiles` (mirroring auth.users, standard
--     Supabase pattern), a `current_org_id()` helper, and RLS policies on
--     every org-scoped table.
--   - `products` and `insight_feedback` didn't have `org_id` at all until
--     this phase (both added above, inline in their CREATE TABLE for fresh
--     installs).
--   - Note for Phase 7 and beyond: `competitor_signals` was added after this
--     comment was written, but is included in the grants/RLS below —
--     search for it if you're looking for where a new table plugs in.
--   - IMPORTANT for anyone re-running this file against a database that
--     already has these tables (e.g. from Phase 1-5): `create table if not
--     exists` is a silent no-op against an existing table — it does NOT add
--     new columns. Confirmed this empirically before writing the ALTER
--     statements below (added org_id to products' CREATE TABLE, re-ran
--     against an already-provisioned DB, column did not appear; Postgres
--     logs `NOTICE: relation "products" already exists, skipping` and moves
--     on). The inline column additions above are only real for a *fresh*
--     database. The explicit `alter table ... add column if not exists`
--     statements immediately below are what actually lands the column on an
--     existing one — this is the pattern any future phase that adds a
--     column to an existing table should follow instead of editing the
--     CREATE TABLE block and assuming it'll take effect.
alter table products add column if not exists org_id int default 1;
alter table insight_feedback add column if not exists org_id int default 1;

-- ---------------------------------------------------------------------------
-- orgs / profiles: standard Supabase multi-tenancy pattern. `profiles`
-- mirrors `auth.users` 1:1 (same id, extended with org_id) rather than
-- storing org_id directly on auth.users, which Supabase manages and doesn't
-- expose for arbitrary columns.
-- ---------------------------------------------------------------------------
create table if not exists orgs (
  id serial primary key,
  name text not null,
  created_at timestamp default now()
);

-- Seed the existing demo dataset's org (id 1) so current data has a real
-- owning org instead of a dangling default.
insert into orgs (id, name) values (1, 'Demo Org') on conflict (id) do nothing;
select setval('orgs_id_seq', greatest((select max(id) from orgs), 1));

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id int references orgs(id) not null default 1,
  created_at timestamp default now()
);

-- current_org_id(): looks up the calling user's org via their profile row.
-- SECURITY DEFINER so it can read `profiles` on the caller's behalf without
-- profiles' own RLS policy (see below) recursing into this function -- the
-- classic footgun with a naive `using (org_id = (select org_id from
-- profiles where id = auth.uid()))` policy written directly on every table:
-- if `profiles` itself needs the same style of policy, that policy would
-- call back into a query against profiles to evaluate, which needs its own
-- policy evaluated, etc. Wrapping the lookup in a SECURITY DEFINER function
-- sidesteps this: the function runs with the privileges of whoever defined
-- it (should be a superuser/owner role in a real deployment), bypassing
-- profiles' RLS for this one, narrow, auth.uid()-scoped lookup.
create or replace function current_org_id() returns int
language sql security definer stable
set search_path = public
as $$
  select org_id from profiles where id = auth.uid()
$$;

-- New-signup provisioning: every new auth.users row gets a profiles row
-- pointing at the shared Demo Org (id 1). This is a deliberate v1 choice —
-- see PHASE6_NOTES.md for the alternative (one fresh, empty org per
-- signup) and why it's a worse fit for a portfolio demo.
create or replace function handle_new_user() returns trigger
language plpgsql security definer
as $$
begin
  insert into profiles (id, org_id) values (new.id, 1);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security: every org-scoped table gets RLS enabled plus a single
-- "your org only" policy driven by current_org_id(). anon/authenticated are
-- Supabase's standard PostgREST roles -- granting table privileges to them
-- is what makes a table reachable via the API at all; RLS then filters which
-- *rows* within that grant are visible. `anon` intentionally gets no grants
-- here: unauthenticated requests should see nothing, not an empty-but-
-- permitted table (matches "no auth" no longer being the demo's posture).
-- ---------------------------------------------------------------------------
-- Read-only reference/fact tables: authenticated users can SELECT, but the
-- app never writes to these directly (data is loaded via the generator
-- script with the service-role key, which bypasses RLS/grants entirely).
grant select on
  brands, retailers, products, sales_facts,
  brand_relationships, signal_notes, competitor_signals
to authenticated;
-- insight_feedback is the one table the app writes to (thumbs up/down).
grant select, insert on insight_feedback to authenticated;
grant select on orgs, profiles to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table brands enable row level security;
alter table retailers enable row level security;
alter table products enable row level security;
alter table sales_facts enable row level security;
alter table brand_relationships enable row level security;
alter table signal_notes enable row level security;
alter table competitor_signals enable row level security;
alter table insight_feedback enable row level security;
alter table orgs enable row level security;
alter table profiles enable row level security;

drop policy if exists org_isolation on brands;
create policy org_isolation on brands for select to authenticated
  using (org_id = current_org_id());

drop policy if exists org_isolation on retailers;
create policy org_isolation on retailers for select to authenticated
  using (org_id = current_org_id());

drop policy if exists org_isolation on products;
create policy org_isolation on products for select to authenticated
  using (org_id = current_org_id());

drop policy if exists org_isolation on sales_facts;
create policy org_isolation on sales_facts for select to authenticated
  using (org_id = current_org_id());

drop policy if exists org_isolation on brand_relationships;
create policy org_isolation on brand_relationships for select to authenticated
  using (org_id = current_org_id());

drop policy if exists org_isolation on signal_notes;
create policy org_isolation on signal_notes for select to authenticated
  using (org_id = current_org_id());

drop policy if exists org_isolation on competitor_signals;
create policy org_isolation on competitor_signals for select to authenticated
  using (org_id = current_org_id());

drop policy if exists org_isolation on insight_feedback;
create policy org_isolation on insight_feedback for all to authenticated
  using (org_id = current_org_id()) with check (org_id = current_org_id());

-- profiles: a user can only ever see/update their own profile row (not
-- driven by current_org_id(), which itself reads from profiles -- this
-- policy has to be self-contained on auth.uid() directly).
drop policy if exists own_profile on profiles;
create policy own_profile on profiles for select to authenticated
  using (id = auth.uid());

-- orgs: a user can see the org row their profile points at (read-only --
-- org creation/renaming isn't exposed to end users in this phase).
drop policy if exists own_org on orgs;
create policy own_org on orgs for select to authenticated
  using (id = current_org_id());

-- ---------------------------------------------------------------------------
-- Phase 7 (proactive monitoring): alerts.
--
-- Written by a scheduled job (app/api/cron/detect-anomalies/route.ts), not
-- the app itself — so it's populated via the service-role key (bypasses
-- RLS entirely, same as the bulk data loader), and authenticated users only
-- ever SELECT from it, never INSERT. No `for all` policy here on purpose.
--
-- Deliberately scoped to velocity swings only, not distribution-based
-- anomalies. Phase 7's competitor_signals work found that
-- generate_synthetic_data.py's acv_distribution field doesn't actually
-- drift slowly as documented (acv_start/acv_drift are drawn per-row
-- instead of per-series) -- so week-over-week ACV deltas are close to
-- independent noise, not a real signal. A "distribution dropped" alert
-- built on that field would mostly be flagging noise, not real gaps. Same
-- reasoning Phase 7 already applied to drop distribution_gain/
-- distribution_loss from competitor_signals -- extending it here rather
-- than reintroducing the same bad signal through a different table.
-- units/dollar_sales aren't affected by that bug (their own noise term is
-- a tight 8% stdev, confirmed against real data before picking the 50%
-- swing threshold below), so velocity swings are the one alert type that's
-- actually trustworthy today.
create table if not exists alerts (
  id serial primary key,
  brand_id int references brands(id) on delete cascade,
  retailer_id int references retailers(id) on delete cascade,
  category text not null,
  region text,
  alert_type text check (alert_type in ('velocity_swing_down', 'velocity_swing_up')) not null,
  week_ending date not null,
  baseline_units numeric,
  actual_units numeric,
  swing_pct numeric,
  narrative text not null,
  org_id int default 1,
  created_at timestamptz default now(),
  unique (brand_id, retailer_id, week_ending, alert_type)
);

create index if not exists idx_alerts_org_created on alerts (org_id, created_at desc);
create index if not exists idx_alerts_brand on alerts (brand_id);

alter table alerts enable row level security;

drop policy if exists org_isolation on alerts;
create policy org_isolation on alerts for select to authenticated
  using (org_id = current_org_id());

grant select on alerts to authenticated;
