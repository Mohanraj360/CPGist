# Phase 3 rebuild notes

## What changed

**`lib/types.ts`** — added `Audience` (`category_manager | trade |
supply_planning | exec`), `AudienceSelection` (`Audience | "auto"`),
`AUDIENCE_LABELS` for display, and an optional `audience` field on
`ChatMessage` so the UI can badge which framing an agent response used.

**`lib/gemini-tools.ts`** — added the audience framing layer:
- `AUDIENCE_FRAMING`: one paragraph per audience, appended to the base
  `SYSTEM_PROMPT` — different emphasis on the *same* tool data (Category
  Manager → shelf share/negotiation; Trade → promo ROI/cannibalization;
  Supply Planning → ACV/stockout risk; Exec → one headline number, no
  jargon)
- `buildSystemPrompt(audience?)`: base prompt alone if no audience given
  (keeps `SYSTEM_PROMPT` usable standalone), base + framing otherwise
- `inferAudience(message)`: lightweight keyword scorer used when the user
  leaves the selector on "Auto" — not a classifier, just deterministic
  keyword matching per audience, defaulting to `category_manager` on ties
  or no match

**`app/api/agent/route.ts`** — accepts an optional `audience` field in the
request body (`Audience` value or `"auto"`). `resolveAudience()` validates
an explicit value against the four known audiences; anything else
(`"auto"`, missing, or invalid) falls through to `inferAudience(message)`.
Builds the model's `systemInstruction` via `buildSystemPrompt(resolved)`
instead of the static `SYSTEM_PROMPT`, and returns the resolved audience in
the response JSON so the UI can show what was actually used — important
when the user left it on Auto and didn't pick anything themselves.

**`components/ChatUI.tsx`** — added an audience toggle in the header (Auto
/ Category Manager / Trade / Supply Planning / Exec), sent with every
request, defaulting to Auto.

**`components/ChatMessageBubble.tsx`** — renders a small "Framed for: X"
badge on agent messages using the audience the server actually resolved
(not just what was selected — matters when Auto inferred something).

## Bug fix while in these files

`components/Sidebar.tsx`'s four quick-start templates and `ChatUI.tsx`'s
empty-state text referenced brand names (`Fizzly`, `CrunchPeak`,
`Nomad Bites`) from the original 5-brand demo dataset — none of which
exist in the Phase 1 110-brand generator. Checked `brands.csv` directly to
confirm they're gone, then swapped in real brands/retailers from the
current dataset (`Bold Snacks`, `True Water Co`, `Urban Crisps`,
`QuickDash`) — including confirming `Urban Crisps` genuinely has narrow
regional presence (`Gulf - Qatar` only) so the whitespace template
actually demonstrates something real, not a coincidentally-named
placeholder. I also introduced this same stale-name bug once myself while
first drafting the ChatUI empty-state copy — caught it doing the same
verification pass, not before.

## Verified

- `npx tsc --noEmit`: clean
- `npm run build`: compiles successfully, same as Phase 1/2
- **Unit-tested the actual logic**, not just compiled it — ran
  `inferAudience` against 5 realistic messages (promo/TPR phrasing →
  trade, distribution/stockout phrasing → supply_planning, board/quarter
  phrasing → exec, share/ranking phrasing → category_manager, and a
  no-keyword message → confirms the category_manager fallback). All 5
  passed. Also confirmed `buildSystemPrompt()` with no audience doesn't
  leak any audience-specific framing text into the base prompt.
- Confirmed the example brand/retailer names now used in the UI actually
  exist in `brands.csv`/`retailers.csv` with the properties the templates
  claim (narrow region presence for the whitespace template).

## What I could not verify here

**No live Gemini call.** This sandbox's network allowlist doesn't include
`generativelanguage.googleapis.com` — only npm/pip/GitHub-type domains —
so I could not actually send a real audience-specific prompt to Gemini and
confirm it changes the narrative the way the framing text intends. What's
verified is: the framing text is correctly selected and appended for a
given audience (unit-tested), the API route correctly resolves and passes
it through (reviewed, logic is simple enough that I'm confident in it, but
it's not independently unit-tested the way `inferAudience` is — pulling
`resolveAudience` out of a Next.js route module for standalone testing
wasn't worth the churn for a ~5-line function), and the build compiles
end-to-end. **Whether Gemini actually writes noticeably different
narratives per audience — not just whether the plumbing is correct — needs
a real run with a live API key**, which is Phase 4+ territory once this is
deployed somewhere with real network access. Worth running a handful of
the same question across all 4 audience settings once you can and
eyeballing whether the tone/emphasis genuinely shifts, before treating
this as done.

## Decisions I made that you may want to weigh in on

1. **`inferAudience` is a simple keyword scorer, not an LLM call.** Using
   Gemini itself to classify audience was an option but adds a second
   model call (and cost/latency) just to pick a framing paragraph.
   Keyword matching is deterministic, free, and testable — but it will
   misfire on phrasing that doesn't use any of the listed keywords (falls
   back to Category Manager). If Auto framing turns out to matter a lot in
   practice, this is the first thing I'd reconsider.
2. **Fixed the stale brand-name bug rather than leaving it for Phase 4.**
   Phase 4 is scoped to *adding* new templates, not auditing the existing
   ones — but I was already touching both files this phase and the bug
   actively breaks the demo (asking about a brand that doesn't exist), so
   fixing it here seemed better than shipping it forward. Flagging in case
   you'd rather I hadn't touched Sidebar.tsx before Phase 4 properly
   rebuilds it.
3. **Audience badge shows the resolved audience, not the raw selection.**
   If the user leaves it on "Auto," the badge shows whatever
   `inferAudience` actually picked (e.g. "Framed for: Trade"), not
   "Framed for: Auto" — this is deliberate so users can see what
   framing they got, but means the badge text won't always match what's
   highlighted in the toggle above it. Worth a look once you can see it
   rendered live.

---

**Before Phase 4**, the main open item is getting a real Gemini API key
into an environment with network access so the audience framing can
actually be exercised live — everything downstream of that (the plumbing,
the keyword inference, the UI) is verified as far as this sandbox allows.
