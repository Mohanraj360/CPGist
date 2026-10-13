# CPGist — App Spec

## What it is
Public marketing + compliance website for **CPGist**, an AI-powered CPG analytics SaaS
("From CPG data to confident decisions"). Built on the farm-ts template: FastAPI + MongoDB
backend, Vite + React 19 + TypeScript (strict) + Tailwind v4 + shadcn/ui (base-nova on
@base-ui/react) + recharts + TanStack Query + react-router-dom.

**Stack decision (documented per problem statement §12):** the current application uses Vite + React 19 + TypeScript with a FastAPI backend. SEO is handled via per-page `usePageMeta` + static
`robots.txt`/`sitemap.xml` in `frontend/public/`.

## Public origin
https://cpgist.vercel.app (frontend port 3000; API on 8001 via /api proxy).

## Routes (all in frontend/src/App.tsx)
- `/` Home — hero, capability strip, problem, platform overview, **interactive product preview**
  (synthetic dataset, working filters), differentiation, audiences, 4-step how-it-works, final CTA
- `/platform` (anchors: executive-dashboard, data-explorer, brand-product, retail-distribution,
  pricing-promotion, ai-analyst, reports)
- `/solutions` (anchors: emerging-brands, retail-sales-teams, category-analysts, consultants)
- `/how-it-works` — 6-step pipeline + data-quality callout
- `/about` — manifesto, principles, honest status ("what's real / what's not"), identity placeholders
- `/contact` — demo/contact form → POST /api/contact/leads (stored in Mongo, validated client+server)
- `/signin` — **live auth**: "Continue with Google" (first-party Google OAuth) plus
  email/password sign-in and sign-up (toggle on the same page). Redirects to `/workspace` when
  already signed in. "Forgot password?" honestly reports that email reset needs a provider.
- `/workspace` — **protected** (ProtectedRoute → redirect to `/signin` when unauthenticated).
  Shows account name/email/avatar, sign-out, an honest "illustrative sample dataset" notice with
  the pending-capabilities list from the API, and the full analytics preview + live AI Analyst.
- Google OAuth callback: the backend handles Google's authorization code, validates the verified email, creates the CPGist session cookie, then redirects to `/workspace`.
- `/privacy`, `/terms`, `/refund-policy`, `/cookies`, `/data-deletion` — draft policies (version
  0.9-draft, effective 2026-10-11, "requires legal review" badges); `/data-deletion` posts to
  /api/compliance/data-deletion-requests; `/cookies` embeds live Cookie Settings
- `*` → NotFound page

## Key components
- `lib/validation.ts` — **pure** form validation shared by Contact, SignIn, and DataDeletion
  (`validateContactForm`, `validateAuthForm`, `validateDeletionRequest`, one `EMAIL_RE`). Server
  validation is independent and authoritative; this is the client-side layer only.
- `components/preview/PreviewCharts.tsx` — `WeeklySalesChart`, `BrandComparisonChart`, and the
  shared `ChartDataTable` (the accessible table equivalent behind each chart's "View data as
  table" details). All recharts primitives live here, not in the preview component.
- `components/site/SubmissionReceipt.tsx` — shared success panel for the Contact and
  DataDeletion forms; renders the server's own message + reference fields, so a success state
  can only come from a real 2xx response.
- `components/preview/InteractiveProductPreview.tsx` — the centerpiece. One synthetic dataset
  (`lib/dataset.ts`, seeded PRNG: 4 brands × 5 retailers × 52 weeks) drives KPI cards, weekly
  sales chart, brand bar chart, retailer table, and the AI Analyst panel. Filters (time
  period / brand / retailer) recompute everything; `variant="hero"` is the compact hero mockup
  (testids prefixed `preview-hero-*` to stay unique against the full variant).
  AI panel: typed questions hit the **live** `/api/analyst/ask` (badge "Live AI response"); the two
  sample investigation buttons render instant precomputed answers (badge "Precomputed sample
  response"). Dataset labelled "Sample preview · illustrative data" throughout.
- `components/compliance/CookieConsent.tsx` + `lib/consent.tsx` — banner + preferences dialog.
  Consent in localStorage key `cpgist_cookie_preferences_v1`; optional categories never
  pre-selected; footer "Cookie Settings" reopens preferences. No analytics/ad providers active.
- `components/site/` — Header (sticky glass, Sheet mobile nav), Footer (navy, 4 columns incl.
  all legal links + Cookie Settings), LegalPageLayout, Sections primitives (Eyebrow,
  SectionHeader, CTARow, MockWindow, Reveal w/ reduced-motion support, EvidencePill).

## Auth (backend/routers/auth.py, backend/lib/auth.py)
Two sign-in paths converge on one **httpOnly `session_token` cookie** (7-day TTL, `secure`,
`samesite=none` for the preview proxy). Tokens are never in a JSON body; nothing is logged.
- `GET /api/auth/google/start` — redirects to Google OAuth using the CPGist Google Cloud client.
- `GET /api/auth/google/callback` — exchanges the authorization code server-side, requires a verified Google email, upserts the user, issues the session cookie, and sends a welcome email for new accounts.
- Email/password signup requires email verification before account access; verification and welcome emails use the configured Gmail API or Resend provider.
- `POST /api/auth/signup` (201) / `POST /api/auth/signin` (200) — email+password, bcrypt via
  passlib. 409 on duplicate signup; 409 with guidance if the email is Google-only; 401 with an
  identical message for bad email *or* password (no account enumeration).
- `GET /api/auth/me` → user or **401** (lets the SPA redirect); `GET /api/auth/session` → user or
  **null** (non-failing probe for public pages); `POST /api/auth/logout` deletes the session + cookie.
- One account per email: `user_id` = `user_<hex12>`, `auth_methods: ["google"|"password"]` grows if
  the same person later uses the other method. All queries project out Mongo `_id`.
- `GET /api/workspace/overview` — protected via the `require_user` dependency.
- Collections: `users` (unique `user_id`, unique `email`), `user_sessions` (unique `session_token`,
  TTL index on `expires_at` so Mongo expires sessions itself).
- Frontend: `lib/session.tsx` owns the `SessionProvider`, `useSession()`, `beginSession()` /
  `endSession()` (clears the react-query cache so one account's data never renders for the next),
  and `startGoogleAuth()` which builds the redirect from `window.location.origin` — never hardcoded.
  NOTE: the template's `lib/session.ts` was deleted; it shadowed this module in Vite resolution.

## Backend (all on api_router under /api)
- `POST /api/analyst/ask` → 200 `AnalystAnswer {question, findings[{kind,text}], note, source}`.
  **Live AI**: Google Gemini API (`GEMINI_API_KEY`, default model `gemini-2.5-flash`) called directly by the FastAPI backend over HTTPS.
  The frontend sends the question + `AnalystContext` (the exact dataset slice on screen, built by
  `frontend/src/lib/analyst.ts`), so the model can only cite visible numbers. System prompt forces
  evidence tagging (observed / calculated / estimate / explanation / limitation) and requires at
  least one observed + one limitation finding; reply is parsed as JSON into Pydantic models.
  422 on malformed input, 502 if upstream fails or output is unparseable, 503 if key missing.
  Precomputed sample investigations remain available offline (`source: "fallback"`).
- `POST /api/contact/leads` → 201 `ContactLeadReceipt {id, status:"received", received_at, message}`;
  Pydantic v2 validation (EmailStr, enums for business_type/primary_challenge); consent recorded
  server-side (marketing_opt_in, policy_version, timestamp, source). Mongo collection `contact_leads`.
- `POST /api/compliance/data-deletion-requests` → 201 `{id, status:"received", verification:"pending",
  ...}`; collection `data_deletion_requests`. Verification happens before any deletion.
- `POST /api/auth/signin` → **503** `auth_not_configured` + `integration_requirements[]` for valid
  payloads (422 for malformed). No credentials logged or stored.
- Indexes for both collections in `lib/db.py` INDEXES (applied at startup).

## Seed facts / accounts
- **Sign-up is open** — create accounts freely via `/signin` → "Create an account", or
  `POST /api/auth/signup`. Password min 8 chars; Terms checkbox required. See
  `memory/test_credentials.md`, and `/app/auth_testing.md` for seeding a session directly.
- No roles/permission tiers — every authenticated user sees the same workspace.
- No seed data needed — the preview dataset is generated deterministically in the frontend.
- Contact submissions land in Mongo `contact_leads` (DB "app").

## Still required before production launch (documented, not faked)
- Legal review of all policy pages; business identity/registration details (placeholders on About + legal pages).
- Email provider for password-reset and marketing email + unsubscribe (not configured).
- Customer data upload + field mapping (workspace currently runs on the sample dataset).
- Optional: analytics provider, only after the existing consent gate.
