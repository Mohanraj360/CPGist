# CPGist portal → CPGist AI SSO

The portal's own email/password and Google authentication remain the account entry point. After the portal verifies a session, it issues a random 90-second, single-use ticket. CPGist AI exchanges that ticket server-to-server, creates/links the matching Supabase identity, then verifies a one-time Supabase OTP in the browser. The Supabase service-role key and shared secret stay server-side.

## Required deployment settings

### CPGist portal backend (Render)
- `CPGIST_AI_URL=https://cpgistai.vercel.app`
- `CPGIST_SSO_SHARED_SECRET`: a long random secret, identical to the CPGist AI deployment setting.

### CPGist AI app (Vercel)
- `CPGIST_PORTAL_API_URL=https://cpgist-api.onrender.com/api`
- `CPGIST_SSO_SHARED_SECRET`: exactly the same secret as the portal backend.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only service-role key for the same Supabase project used by the app. Never prefix this with `NEXT_PUBLIC_`.
- Existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must remain configured.

Generate one shared secret and set it in both environments (example: `openssl rand -hex 32`). Redeploy both the Render backend and Vercel app after setting these values. The app's public login route sends users to `https://cpgist.vercel.app/signin`; dashboard access uses the established Supabase session.

## Verification checklist
1. Sign in on the company portal with a verified email/password account.
2. Confirm the browser moves to `cpgistai.vercel.app/sso` and then `/dashboard`.
3. Confirm there is no second login prompt and refreshing the dashboard preserves the session.
4. Repeat with Google sign-in and a new portal account.
5. Confirm an expired/reused ticket fails and that neither shared secret nor service-role key is present in browser assets.
