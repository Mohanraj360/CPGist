# Phase 7 rebuild notes

## What changed

Built `competitor_signals` — the table Phase 2 explicitly deferred ("Kept
as two separate tables from Phase 8's future competitor_signals... —
brand_relationships is structural, competitor_signals will be event-based;
different shapes, decided now so this schema doesn't need revisiting when
Phase 8 arrives").

**`supabase/schema.sql`**
- New `competitor_signals` table: `brand_id` (whichever brand took the
  action), `category`, `retailer_id`, `region`, `signal_date`,
  `signal_type`, `magnitude_pct`, `description`, `org_id`. "Which of our
  brands should care" is resolved at query time via `brand_relationships`
  (`relationship_type = 'competitor'`), not a second denormalized FK —
  that edge already exists.
- Wired into Phase 6's RLS: enabled, granted `SELECT` to `authenticated`,
  `org_isolation` policy — same shape as `brand_relationships`/
  `signal_notes`. Since it's a genuinely new table (not a new column on an
  existing one), plain `create table if not exists` is fine here — no ALTER
  footgun risk.

**`scripts/generate_phase7_data.py`** (new) — derives `competitor_signals`
rows from real patterns in `sales_facts`, same grounding discipline as
Phase 2's `signal_notes` generator. Originally planned two signal types;
shipped with one. See "A bigger bug" below for why.

**`lib/tools/getCompetitiveSignals.ts`** (new) — resolves a brand's
competitor-edge brands via `brand_relationships`, then pulls their recent
`competitor_signals` rows. Wired into `lib/gemini-tools.ts` (declaration,
dispatcher, system prompt) and added as a 7th Sidebar quick-start template
(verified against real data: Bold Snacks -> 3 competitor brands -> 60 real
signal rows in the lookback window).

**`lib/tools/datasetClock.ts`** (new) + **`lib/tools/getBrandContext.ts`**
(fixed) — see "A real bug, fixed" below.

## A real bug, fixed: `getBrandContext.ts`'s recency window was always empty

While building `getCompetitiveSignals`'s own "recent" window, I went to
copy `getBrandContext.ts`'s `new Date() - 56 days` pattern and checked what
it'd actually return first. It returns zero, always, for every brand:

```
select count(*) from signal_notes where date_end >= (current_date - interval '56 days');
 would_return
--------------
            0
(out of 501 total notes)
```

This dataset is synthetic and frozen in time — its last real date is
2025-12-28 — but `getBrandContext.ts` anchored its lookback to wall-clock
`new Date()`. That was fine when Phase 2 wrote it (real time and dataset
time were close together) and has been silently broken ever since real
time drifted past the dataset's last date. `recent_signal_notes` has
presumably been returning `[]` for every brand, every call, since some
point after Phase 2 shipped — Phases 3 and 4 didn't touch this file, so
nothing since would have caught it either.

Fixed by extracting `getDatasetAsOfDate()` into `lib/tools/datasetClock.ts`
— queries the actual `max(week_ending)` from `sales_facts` and anchors any
"recent window" calculation to that instead of real time. Used by both the
fixed `getBrandContext.ts` and the new `getCompetitiveSignals.ts`, so the
new tool doesn't ship with the same bug on day one. Verified the fix
directly: the same query anchored to `2025-12-28` instead of real "now"
returns all 501 notes as in-window candidates (before per-brand filtering
and the 10-row limit) — confirmed non-zero, not just "no longer erroring."

## A bigger bug, found but NOT fixed here: `acv_distribution` doesn't drift

The original plan for this phase was two signal types: `promo_launch` and
a distribution-shift pair (`distribution_gain`/`distribution_loss`) off
week-over-week ACV swings. Building the second one, the numbers didn't
look right before I'd written a single line of detection logic:

```
sales['delta'] = sales.groupby(['product_id','retailer_id'])['acv_distribution'].diff()
sales['delta'].std()  ->  22.08   (on a 0-100 scale)
```

A real `(product_id, retailer_id)` series, sorted by week:
`50.8 -> 35.5 -> 53.3 -> 83.0 -> 70.1 -> 48.0 -> ...` — that's not "slow
drift," that's close to independent noise week to week.

Root cause, in `generate_synthetic_data.py`:
```python
acv_start = rng.uniform(35, 85, size=n)
acv_drift = rng.uniform(-15, 20, size=n)
acv = np.clip(acv_start + acv_drift * t + rng.normal(0, 1.5, size=n), 5, 100)
```
`n` is every `product x retailer x week` row in the *entire* dataset, not
one row per `(product, retailer)` series. So `acv_start`/`acv_drift` get a
fresh independent draw for every single week, instead of one persistent
pair per series that `t` (the week-within-series fraction) then drifts
smoothly from. The `rng.normal(0, 1.5)` noise term is the only part of the
formula that's actually behaving as documented — it's just riding on top
of what's effectively two more independent random draws every week, which
dwarfs it.

This is a Phase 1 bug, not introduced by this phase, and it's not narrowly
scoped to competitor_signals — anything built on `acv_distribution` having
real per-series persistence inherits it:
- `v_distribution_gaps` (Phase 1's own view)
- `signal_notes`' `distribution_gap` notes (Phase 2) — these are grounded
  in whatever `v_distribution_gaps` says, which is grounded in this noise
- the `distribution_gain`/`distribution_loss` signal types I'd planned for
  this table

**I didn't fix it.** Patching `generate_synthetic_data.py` means
regenerating a large fraction of the ~1.5M-row dataset, which would
invalidate specific numbers already verified and written down across
Phases 1-6 (exact row counts, the Phase 5 regression coefficients, the
Phase 6 view-leak test's "before" baseline, etc.) and require re-running
that verification. That's a real, disruptive scope change that deserves to
be a decision you make on purpose, not something that happens as a side
effect of "add a new table" — see below.

**What I did instead:** scoped this phase down to the one signal type that
isn't affected — `promo_launch` doesn't touch `acv_distribution` at all,
`on_promo` is drawn as a genuine independent-per-week Bernoulli by design
(promos are meant to be memoryless week to week, unlike distribution),
so "first week of a new promo streak" is legitimately grounded. Kept
`distribution_gain`/`distribution_loss` in the `signal_type` check
constraint (so the schema doesn't need a second migration once this is
fixed) but the generator only populates `promo_launch` — 2,200 rows,
capped at 20/brand from 216,710 raw launch-weeks, verified end-to-end
against Postgres (see below).

## Verified against a real Postgres instance

Reused the fresh-install database from Phase 6's verification pass
(`cpgist_fresh`), re-applied the updated `schema.sql` (competitor_signals
+ RLS additions land cleanly on top of the existing Phase 1-6 tables/data)
and `views.sql`, loaded `competitor_signals.csv` (2,200 rows).

- Confirmed `anon` gets `permission denied for table competitor_signals`
  (no grants — matches every other table's posture).
- Simulated `getCompetitiveSignals("Bold Snacks")`'s full query chain as
  an authenticated org-1 user: resolved brand id 2, its 3 competitor-edge
  brands (`brand_relationships`, ids 3/6/10), and pulled their real
  `competitor_signals` rows (60 signals from those 3 brands, e.g. "Prime
  Snacks launched a promo at FreshMart (Saudi) the week of 2025-12-28,
  Display, 18% depth" — a real row, not a placeholder).
- Confirmed the `getBrandContext.ts` fix: the anchored-to-2025-12-28
  version of its query returns 501 candidate notes where the old
  wall-clock version returned 0.

**Build**: `npx tsc --noEmit` clean, `npm run build` compiles (had to
`npm install` again after Phase 6's cleanup step removed `node_modules` —
not a new issue, just a reminder that this repo isn't self-installing
between phases).

## Not verified here

Same limitation as every phase since 3: no live Gemini key, so
`get_competitive_signals` being called correctly and usefully by the
actual agent (not just returning correct data when invoked directly) is
unverified. The Sidebar's new "Competitor Activity" template phrasing
("Has anyone in Bold Snacks' competitive set launched a promo recently?")
is designed to trigger it based on the tool's description, but that's a
prediction, not a confirmed behavior.

## Decisions I made that you may want to weigh in on

1. **Shipped one signal type instead of two, rather than fixing Phase 1's
   generator to unblock the second.** Detailed above — the fix is real
   work with a real blast radius (dataset regen + re-verifying prior
   phases' numbers), and deserves to be something you ask for, not
   something that happens because I was two-thirds done building
   `distribution_gain`/`distribution_loss` when I noticed the data
   couldn't support it honestly.
2. **`brand_id` on `competitor_signals` is "whoever took the action,"
   not a second FK to "the brand this is relevant to."** Mirrors how
   `brand_relationships` already owns the competitor edge — resolving
   relevance at query time (join through `brand_relationships`) avoids
   storing the same relationship twice in two different shapes.
3. **Capped at 20 `promo_launch` signals per brand** (2,200 total from
   216,710 raw launch-weeks) — a brand with many retailers running promos
   constantly would otherwise dominate the table and drown out everything
   else; recent-first sampling keeps the cap from being arbitrary about
   *which* 20.

---

Two bugs found this phase, one fixed (the wall-clock window — small,
contained, done) and one deliberately left alone (the ACV generation flaw
— big, would touch nearly everything already verified in Phases 1-6, and
you should decide if/when that's worth doing rather than have it happen
as a rider on "add a table"). If you want the ACV fix as its own phase,
the scope would be: fix `generate_synthetic_data.py`'s
`acv_start`/`acv_drift` sampling to be per-series, not per-row; regenerate
`sales_facts.csv`; reload; re-verify `v_distribution_gaps`,
`signal_notes`' `distribution_gap` rows, and anything else that cites a
specific row count or number from the old data in these notes; and only
then come back to `distribution_gain`/`distribution_loss` here.
