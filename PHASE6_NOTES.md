# Phase 6 rebuild notes

## What changed

Multi-tenancy is now real, not just a dangling `org_id` column. Phase 1
added `org_id` to `brands`/`retailers`/`sales_facts` and Phase 2 extended it
to `brand_relationships`/`signal_notes`, but nothing enforced it — any query
saw every org's data. This phase wires it up end to end:

**`supabase/schema.sql`**
- Added `org_id` to `products` and `insight_feedback` (the two tables that
  didn't have it yet).
- New `orgs` and `profiles` tables (`profiles` mirrors `auth.users` 1:1,
  extended with `org_id` — the standard Supabase pattern).
- Seeded `orgs.id = 1` ("Demo Org") so the existing dataset has a real
  owning org instead of a dangling default.
- `current_org_id()` — a `SECURITY DEFINER` helper that resolves the
  caller's org via their profile row, used by every RLS policy.
- `handle_new_user()` — a trigger on `auth.users` insert that
  auto-provisions a `profiles` row into the Demo Org for every new sign-up.
- RLS enabled on every org-scoped table, with a `current_org_id()`-driven
  policy on each, plus the `GRANT`s that make each table reachable via
  PostgREST at all (`anon` gets none; `authenticated` gets `SELECT` on the
  read-only tables and `SELECT, INSERT` on `insight_feedback`).

**`supabase/views.sql`**
- Every view now has `with (security_invoker = true)`, and each needs its
  own `grant select ... to authenticated` (see "Bugs found" below — this
  isn't cosmetic).

**App layer**
- `lib/supabase.ts` rewritten: was a stateless anon-key client
  (`persistSession: false`, no user context). Now builds a request-scoped
  client via `@supabase/ssr`'s `createServerClient`, reading the caller's
  session from cookies so RLS applies as *them*. Same exported function
  name (`getSupabaseServerClient`), so none of `lib/tools/*.ts` or the
  agent/forecast/feedback routes needed to change.
- `lib/supabase-browser.ts` (new) — browser client for the login page only.
- `middleware.ts` (new) — refreshes the session on every request, gates
  every route (pages → redirect to `/login`, `/api/*` → 401 JSON instead of
  a redirect, since a `fetch()` call following a 302 to an HTML page is a
  bad failure mode for `ChatUI.tsx`'s agent calls).
- `app/login/page.tsx` (new) — email+password sign-in/sign-up. No
  magic-link flow — that needs a configured email provider and an
  `/auth/callback` route, extra moving parts that add nothing testable
  here and nothing runnable by someone without that config already done.
- `components/SignOutButton.tsx` (new), wired into `ChatUI.tsx`'s header.

## Two real bugs found while building this (not hypothetical)

**1. Views completely bypass RLS on their underlying tables unless created
with `security_invoker = true` — confirmed by reproducing the leak, not by
reading about it.** Before adding the fix: seeded a second org (`id 2`)
with a phantom brand + product + sales row, then queried `v_channel_mix` as
an authenticated org-1 user. The phantom org-2 brand came back in the
result — even though the equivalent direct `select * from brands` correctly
excluded it. Every tool in `lib/tools/*.ts` queries these views, not the
base tables directly, so without this fix Phase 6's entire RLS layer would
have been silently inert for every real agent query while looking correct
under a naive spot-check against the tables themselves. Re-ran the exact
same query after adding `security_invoker = true` — phantom row count
dropped from 1 to 0, and the legitimate org-1 row counts (`v_channel_mix`:
457, `v_brand_share`: 378,872, `v_distribution_gaps`: 7,351) were unchanged
from their pre-RLS baselines, confirming the fix removes the leak without
removing legitimate data.

**2. `create table if not exists` silently no-ops column additions on a
table that already exists — confirmed empirically, not assumed.** Edited a
throwaway copy of `products`' `CREATE TABLE` to add `org_id`, re-ran it
against the Phase 1-5 database (which already has a `products` table), and
the column did not appear (`NOTICE: relation "products" already exists,
skipping`). This matters here specifically because `schema.sql` is treated
as the cumulative "current state" file and re-applied phase over phase
against the *same* database, not run once against a fresh one each time —
which is exactly what I did in this sandbox to test the upgrade path, and
exactly what your actual Supabase project would need if you're applying
each phase's `schema.sql` sequentially rather than rebuilding from scratch.
Fixed by using explicit `alter table ... add column if not exists`
statements for the two column additions in this phase, and flagged the
pattern in `schema.sql`'s Phase 6 comment block for whoever adds the next
column to an existing table.

## Verified against a real Postgres instance (with a stubbed auth schema)

Postgres 16 doesn't ship Supabase's `auth` schema, `auth.uid()`, or the
`anon`/`authenticated` roles, so I built a faithful stand-in to test
against rather than skip verification:
- `auth.users(id uuid, email text)`
- `auth.uid()` reading `current_setting('request.jwt.claim.sub', true)`,
  matching Supabase's real implementation
- `anon` and `authenticated` roles (both `nologin`, matching how PostgREST
  actually connects)

Test sequence, each step actually run, not assumed:

1. Re-applied the updated `schema.sql` against the existing Phase 1-5
   database (110 brands / 200 retailers / 440 products / 1,515,488 sales
   rows) — confirms the upgrade path works on real data, not just a fresh
   install.
2. Confirmed `org_id` landed on `products` via the `ALTER` statement (the
   footgun above, fixed).
3. Inserted a stub `auth.users` row and confirmed `handle_new_user()`
   auto-created its `profiles` row with `org_id = 1`.
4. `set role anon; select * from brands;` → `permission denied for table
   brands` (no grants at all — a hard auth failure, not a quiet empty
   result, which PostgREST turns into a 401/403).
5. `set role authenticated` with no JWT claim set → 0 rows from `brands`
   (RLS correctly denies when `auth.uid()` resolves to null).
6. `set role authenticated` + the stub user's claim → 110 brands, 1,515,488
   sales rows, 440 products, all correct — and (once view grants were
   added) `v_brand_share` etc. also worked.
7. The phantom-org-2 leak test and fix, described above.
8. Re-ran the leak test post-fix: 0 phantom rows, legitimate row counts
   unchanged.

**Build**: `npx tsc --noEmit` clean, `npm run build` compiles (middleware
included in the build output as Edge middleware, ~86 kB).

## Not verified here

No live Supabase project, so the actual `/login` → `signUp`/
`signInWithPassword` → cookie-session → middleware-refresh round trip
hasn't run against a real `auth.users` table or real JWTs — only the SQL
side (RLS policies, the trigger, the views) against the stubbed schema
above, and the Next.js side (`tsc`, `next build`) in isolation. The stub
`auth.uid()` reads the same session variable Supabase's real one does and
the grant/policy mechanics are identical, so I'd expect this to work
unchanged against a real project, but "the SQL is verified" and "the
end-to-end login flow is verified" are different claims — worth an actual
sign-up test against a live Supabase project before calling this done.

Also not verified: whether Gemini's agent responses change at all now that
requests are RLS-scoped (they shouldn't — same data, same org, just
authenticated instead of anonymous) — no live Gemini key here either, same
limitation as every phase since 3.

## Decisions I made that you may want to weigh in on

1. **Every new sign-up joins the existing Demo Org (`org_id = 1`) rather
   than getting a fresh, empty org of their own.** The alternative (one org
   per sign-up) is the more realistic pattern for genuine multi-tenant SaaS,
   but it means every new account would see an empty dataset — fine for
   proving isolation works (which I tested directly via the phantom org-2
   scenario instead), useless for a portfolio demo where the point is
   letting someone sign up and immediately explore the populated dataset.
   If real multi-tenant onboarding becomes a goal, `handle_new_user()` is
   the one place that changes.
2. **Password auth, not magic link.** Magic link needs a configured email
   provider on the Supabase project and an `/auth/callback` route; password
   auth needs neither and works on a stock Supabase project. Documented the
   tradeoff in `README.md` rather than silently picking one.
3. **`/api/*` routes return 401 JSON on missing auth; page routes redirect
   to `/login`.** Different failure modes for different consumers — a
   `fetch()` in `ChatUI.tsx` following a redirect to an HTML login page is
   a worse failure than a JSON error it can actually branch on, even though
   neither path is wired up to *display* that 401 specially in the UI yet
   (a real unauthenticated `/api/agent` call today would just show
   `res.ok === false` and the generic "Something went wrong" text — fine
   as a fallback, not a polished experience).
4. **`insight_feedback` inserts still rely on the column default
   (`org_id int default 1`) rather than the app explicitly setting
   `org_id: current_org_id()` on every insert.** Works today because every
   user is in org 1 by construction (decision 1 above); would need an
   explicit value (or a `BEFORE INSERT` trigger defaulting it from
   `current_org_id()`) the moment a second real org exists. Flagging
   instead of building it now, since there's no path to a second populated
   org yet either.
5. **Read-only tables (`brands`, `retailers`, `products`, `sales_facts`,
   `brand_relationships`, `signal_notes`) get `SELECT`-only grants and
   `for select` policies** — the app never writes to them at runtime (data
   loading happens via the service-role key, which bypasses RLS/grants
   entirely). Only `insight_feedback` gets `INSERT` too, since it's the one
   table the UI actually writes to.

---

RLS is now real — verified by actually breaking it (the view leak) and
then verifying the fix closes exactly that hole without touching anything
legitimate. The `schema.sql`-is-cumulative footgun is worth remembering for
every phase after this one: a column added inside a `CREATE TABLE`
statement is invisible to any database that already has that table: this
came up because I was testing the upgrade path against real Phase 1-5
data rather than a fresh install, and I'd recommend the same test before
trusting any future schema change here. Next open item, if you want it:
the live Supabase Auth round-trip is the one piece of this phase that
genuinely needs a real project to confirm, not just careful local
simulation.
