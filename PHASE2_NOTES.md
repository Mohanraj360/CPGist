# Phase 2 rebuild notes

## What changed

**`scripts/generate_phase2_data.py`** — new script, reads the Phase 1 CSVs
(`brands.csv`, `retailers.csv`, `products.csv`, `sales_facts.csv`) plus an
export of `v_distribution_gaps`, and produces two new CSVs:

- **`brand_relationships.csv`** — 316 directed edges (8 sibling, 308
  competitor). Competitive-set membership is scoped by **category +
  region overlap**, not category alone: two brands in the same category
  with zero overlapping `home_regions` are skipped, not linked. Siblings
  (shared `parent_company`) are kept even without region overlap, since
  portfolio structure is true regardless of where either brand currently
  sells. Edges are stored directed both ways so a lookup is a single
  `WHERE brand_id = X`.
- **`signal_notes.csv`** — 501 notes (171 `distribution_gap`, 180
  `cannibalization_risk`, 150 `competitive_pressure`). None of these are
  invented flavor text — each is derived from a real pattern already
  present in the Phase 1 data:
  - `distribution_gap`: worst regional ACV gap per (brand, region) from
    `v_distribution_gaps`, filtered to >10pt gaps so these are genuine
    findings, not noise near the category average
  - `cannibalization_risk`: reuses the exact detection logic used to
    verify Phase 1's cannibalization signal (sibling SKU units vs. its own
    non-promo baseline during a promo week), flagging the biggest dips
    (>12%)
  - `competitive_pressure`: for competitor-edge brand pairs, weeks where
    both brands had a product on promo at the same retailer in the last
    ~8 weeks of data — a real co-occurrence pulled from `sales_facts`, not
    an assumed rivalry

**`supabase/schema.sql`** — added `brand_relationships` and `signal_notes`
tables. `signal_notes`' join key is
`(brand_id, category, retailer_id, region, date_start, date_end)` as specced
— `retailer_id`/`region` are nullable since not every note is
retailer-specific. Kept `brand_relationships` (structural) separate from
Phase 8's future `competitor_signals` (time-stamped events) as decided
during Phase 1 review.

**`lib/tools/getBrandContext.ts`** — new agent tool. Given a brand name,
returns its siblings, category+region-scoped competitors, and signal notes
from the last ~8 weeks. Source-traces to
`["brands", "brand_relationships", "signal_notes"]`.

**`lib/gemini-tools.ts`** — registered `get_brand_context` as a Gemini
function-calling tool, wired into the dispatcher, and updated
`SYSTEM_PROMPT` to instruct the agent to call it alongside
`get_brand_ranking` / `get_promo_lift_analysis` for brand-specific
questions, and to fold in relevant notes (cannibalization, overlapping
competitor promos) rather than attributing a number purely to the brand's
own performance. Explicitly scoped to *not* fire on generic category/
channel-mix questions with no single brand in focus, to avoid noisy
over-calling.

## Verified against the same live Postgres instance as Phase 1

Re-applied `schema.sql` (existing tables/indexes correctly skipped via
`if not exists`), loaded both new CSVs, confirmed:

| table | rows |
|---|---|
| brand_relationships | 316 |
| signal_notes | 501 |

DB size after Phase 2: **202MB** (was 201MB after Phase 1 — these two
tables are tiny next to `sales_facts`, as expected).

**One thing worth flagging from this process**: none of Phase 1's four
CSVs include an `org_id` column (it's a schema default), so a plain
`\copy tablename from 'file.csv' with (format csv, header true)` fails
with "missing data for column org_id" — needed an explicit column list to
load them. I hit this loading Phase 1's own data before starting Phase 2
work, so I applied the same explicit-column-list pattern to my own Phase 2
CSVs and added `org_id` to them directly to avoid the same footgun.
Whoever imports Phase 1's CSVs into Supabase's table editor should expect
this too (Supabase's CSV importer may or may not handle it more gracefully
than raw `\copy` — worth checking rather than assuming).

**Also verified the tool's actual query chain**, not just the raw data —
ran the equivalent of what `getBrandContext` executes (brand lookup →
relationships join → notes filtered to the trailing-8-week window) directly
against Postgres for a real brand (`True Snacks`) and got a coherent,
non-contradictory result: 2 competitors in its one home region, one
distribution gap note, two competitive-pressure notes referencing those
same competitor names and region. Output included in the PR/commit if
useful as a fixture example.

**TypeScript**: `npx tsc --noEmit` clean, and a full `npm run build`
compiles successfully (dummy env vars, since build-time doesn't hit the
DB) — this catches issues `tsc --noEmit` alone can miss (Next.js route
conventions, etc.).

## Not yet done (by design — later phases)

- `get_brand_context` is registered as a tool the agent can *call*, but
  nothing in `getBrandRanking.ts` / `getPromoLiftAnalysis.ts` calls it
  automatically — it relies on the system prompt instructing Gemini to
  call it as a second tool when relevant. Worth watching in Phase 3 (once
  the chat UI is exercised live) whether Gemini actually reaches for it
  reliably, or whether it needs to be called deterministically from inside
  the other tool functions instead of left to the model's discretion.
- `competitor_signals` (Phase 8) — separate table, not started.
- `region` isn't yet threaded into `getChannelMix.ts` /
  `getDistributionWhitespace.ts` themselves (the views support it since
  Phase 1, the tool functions don't pass it through yet) — flagged in
  Phase 1 notes as remaining Phase 2/3 work; still open, can fold into
  Phase 3 since that's already touching the system prompt for
  audience-framing.

## Decisions I made that you may want to weigh in on

1. **Directed edges (both A→B and B→A) instead of one row per pair.**
   Doubles `brand_relationships` row count (still tiny — 316 rows) but
   makes every lookup a single `WHERE brand_id = X` with no `OR` clause.
   Given the row count is trivial either way, I'd keep this, but flagging
   since it's a real tradeoff (storage/write simplicity vs. query
   simplicity) that would matter more at larger scale.
2. **Cap of ~150-220 notes per type.** Arbitrary but deliberate — enough to
   be a real, sampled-from-data signal without flooding `signal_notes`
   with every possible gap/dip/overlap in the dataset (which would be
   thousands and mostly redundant). Happy to raise the caps if thinner
   coverage becomes a problem once Phase 3's audience-framing starts
   consuming these.
3. **`get_brand_context` is a full agent-callable tool, not silent
   server-side enrichment inside the existing tools.** I considered baking
   context lookup directly into `getBrandRanking`/`getPromoLiftAnalysis` so
   it's never skipped, but that breaks the existing "each tool = one
   source-traceable thing" pattern the repo already uses, and makes every
   existing tool call slower even when context isn't relevant (e.g. a
   category-wide ranking with 15 brands). Kept it as a separate
   agent-callable tool per the system-prompt instruction instead — see the
   open question above about whether Gemini reaches for it reliably enough
   in practice.

---

**Before I move to Phase 3**, let me know if the directed-edges approach and
note caps look right, or if you'd rather I make `get_brand_context` a
deterministic auto-call from inside the other tools instead of leaving it
to the model's discretion.
