# Phase 9 rebuild notes (positioning polish — final phase)

**Numbering note**: original plan's Phase 9. Everything from the 9-phase
plan is now built — see the previous instance's numbering note in
`PHASE8_NOTES.md` for how the "original 7/8" vs. "this delivery's 7/8" swap
happened. This phase is documentation/copy only; no schema, no new tables,
no new tool logic.

## What changed

**`README.md`** — full rewrite. The previous version was accurate for
Phase 6 (auth/RLS, which is what wrote it) and stale on everything since —
it didn't mention `brand_relationships`, `signal_notes`,
`competitor_signals`, `alerts`, audience framing, or the What-If simulator
existed at all, and its "Build order" section described the Phase-1-era
6-step app. Every phase since 2 flagged this drift in its own notes ("not
bundled into a phase whose actual job is something else") rather than
scope-creeping into fixing it — this is that fix, now that it's actually
this phase's job. Covers: positioning (expanded past the regional claim to
the five things that actually differentiate this from a database-wrapped
chatbot — see below), the full 7-tool table, accurate project layout,
accurate setup steps including the two scripts and one manual Supabase
export the old README never mentioned, and a dedicated section surfacing
the ACV data-quality limitation Phase 7 found rather than letting it live
only in that phase's notes file where a portfolio reviewer wouldn't think
to look.

**`components/AlertsFeed.tsx`** — one-line fix: the dropdown header said
"Distribution & velocity alerts," but Phase 8 explicitly shipped
velocity-only (see that phase's "Why distribution-based alerts aren't
here" section) — the component's own `alert_type` union type two lines
above the header (`"velocity_swing_down" | "velocity_swing_up"`) already
said as much. Found reading the file to understand what positioning needed
to describe accurately; fixed since an inaccurate label in the one UI
surface a reviewer would actually click into undercuts the same honesty
this rebuild has been deliberate about in every phase's notes.

**`components/ChatUI.tsx`** — added one clause to the empty-state copy
mentioning the alerts bell exists and what it's for. Nothing previously
told a first-time user it was there.

## Positioning, reconsidered

The pre-existing "Positioning" section (written in the original scaffold,
before any of Phases 1-8 existed) made one claim: Quick Commerce +
General Trade coverage vs. US-only tools. Still true and still worth
leading with, but eight phases in, it undersells what's actually been
built — a regional-coverage claim alone doesn't distinguish this from "the
same chatbot with different city names in the seed data." Rewrote the
section around five concrete, individually-verified differentiators
(elasticity model, RLS isolation, cross-brand context, audience framing,
proactive alerts), each pointing at the phase notes that verified it
rather than just asserting it. The framing choice: every claim in that
section is followed by "See PHASE\_N\_NOTES.md" — positioning copy that
can't point at its own receipts is exactly the kind of thing this rebuild
has been pushing back on since Phase 5.

Deliberately did **not** turn this into unqualified marketing copy. The
new README also has a full "known data-quality limitation" section
surfacing the ACV bug prominently (not just linked from Phase 7's notes)
and an unchanged "what's stubbed" list. A positioning pass that hides the
one thing most likely to come up if someone actually pokes at the
distribution-whitespace numbers isn't positioning, it's setting up a bad
interview conversation.

## Verified

- **Every factual claim in the new README cross-checked against the
  actual code**, not written from memory of what the phases probably did:
  the tool table against `lib/gemini-tools.ts`'s live declarations, the
  project layout against an actual `find`/`ls` of the repo, the table/view
  list against `grep`ing `schema.sql`/`views.sql` directly, the setup
  steps' script order against each generator script's own `read_csv`
  calls (confirming `generate_phase2_data.py` needs
  `distribution_gaps_export.csv` — a manual Supabase-export step the old
  README never mentioned at all), the `CRON_SECRET` step against
  `.env.local.example` and the cron route's actual auth check, and the
  `WhatIfSimulator.tsx` default brand/retailer (still "True Water Co" /
  "QuickDash (Metro)" from Phase 5's fix) against a fresh grep of
  `brands.csv`/`retailers.csv` to confirm they're still valid names in
  this delivery's dataset before citing them again.
- **Full schema + views re-applied to a genuinely fresh database**
  (`cpgist_final`, not reused from a prior phase) as a whole-pipeline
  integrity check — every phase's DDL together in one file, one shot, zero
  errors (`schema exit: 0`, all output was expected first-run NOTICEs).
- **`alerts` table RLS, tested directly** (the one table added since my
  last own verification pass, in Phase 8, by a different delivery — worth
  confirming myself rather than trusting the notes alone): seeded a real
  org-1 alert and a phantom org-2 alert (with real FK-satisfying brand/
  retailer rows, not just alert rows in isolation), queried as an
  authenticated org-1 user — exactly the 1 real alert, 0 phantom. Queried
  as `anon` — hard permission-denied, matching every other table's
  posture.
- `npx tsc --noEmit` clean, `npm run build` compiles — all 7 API routes
  present (`/api/agent`, `/api/alerts`, `/api/cron/detect-anomalies`,
  `/api/export-pdf`, `/api/feedback`, `/api/forecast`, plus `/login`).

## Not verified here

Same standing limitation as every phase since 3: no live Gemini key, so
whether the *agent's actual conversational behavior* matches what the
README now describes (e.g. that it genuinely calls `get_brand_context`
before attributing a swing to a brand's own performance, per
`gemini-tools.ts`'s system prompt instruction) is unconfirmed by direct
observation — confirmed instead that the system prompt actually contains
that instruction, and that the tool exists and returns correct data when
called directly (Phase 2's and 7's own verification). The positioning copy
describes what the code is built to do, which is one step short of "what
it's been observed doing."

## Decisions worth weighing in on

1. **Left the ACV bug unfixed, again.** Three phases in a row now
   (7, 8, 9) have found, documented, and deliberately not fixed the same
   root cause. Phase 7's notes called it "a deliberate, contained
   follow-up, not something to fix quietly" and that's still the right
   call for a documentation-only phase — but three consecutive phases
   citing the same open issue is a strong signal it's worth actually
   scheduling rather than re-flagging a fourth time whenever the next
   feature touches distribution data.
2. **Positioning copy names specific phase-notes files as its evidence**
   rather than being self-contained. Slightly unusual for a README aimed
   partly at portfolio reviewers who won't necessarily open eight
   additional markdown files — but the alternative (repeating the
   verification detail inline) would make the README itself much longer
   and duplicate content that's already written once, correctly, in each
   phase's notes. Kept the README as the pitch + map, phase notes as the
   receipts.

---

All nine phases of the original plan are now built: data + semantic layer
(1), knowledge-graph-lite (2), audience framing (3), UI templates (4),
real elasticity (5), real auth/RLS (6), competitor intelligence (7),
proactive alerts (8), and this positioning pass (9). Three things remain
open across the whole rebuild, none of them silent: the ACV generation bug
(flagged in 7, 8, and now 9), no live Gemini/Vercel Cron verification
(flagged in every phase since 3), and the PDF export's missing chart
images (flagged since the original scaffold). All three are named in
`README.md`'s "what's stubbed" and "known data-quality limitation"
sections, not just buried in individual phase notes.
