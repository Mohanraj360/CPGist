# CPGist archive audit (2026-10-12)

## Initial findings
- ZIP integrity: passed; 144 entries in source archive.
- Architecture: monorepo-style layout with React 19 + TypeScript + Vite 8 frontend (`frontend/`) and FastAPI backend (`backend/`), MongoDB/Motor persistence, and Playwright/pytest test workspaces.
- Frontend dependencies are pinned in `frontend/package.json` and `frontend/yarn.lock`; tests use `tests/yarn.lock`; backend dependencies are in `backend/requirements.txt`.
- Backend entry point: `backend/server.py`; routers: auth, analyst, leads, workspace. API prefix is `/api`.
- AI integration: `GEMINI_API_KEY` used server-side in `backend/routers/analyst.py`; live AI endpoint reports 503 when not configured.
- Authentication: email/password plus first-party Google OAuth authorization-code exchange; sessions stored in MongoDB and issued as secure, HttpOnly cookies.
- Database: MongoDB via `MONGO_URL` and `DB_NAME`; indexes are ensured at backend startup in `backend/lib/db.py`. No versioned migration directory or seed scripts were present.
- Preview analytics data is synthetic/illustrative. The workspace endpoint explicitly marks its dataset as sample; do not present the preview as real customer or syndicated market data.
- Existing root README was stale and described a generic `farm-ts` starter. It has been replaced with project-specific setup/deployment guidance.
- Added `backend/.env.example`; updated `.gitignore` to exclude environment files, test credentials, generated caches, and local development recordings.
- Removed `memory/test_credentials.md` and generated local recordings/scripts from the prepared copy to avoid publishing test login credentials and local development artifacts. No application source features were intentionally removed.

## Security scan
- Heuristic scan for private keys, GitHub tokens, AWS access keys, literal MongoDB credential URIs, and long generic API-key assignments: no matches in the prepared source copy.
- This is not a substitute for GitHub secret scanning or a full history scan.
- Never commit `.env` files. Rotate any real credential that may have been exposed elsewhere.

## Checks run
- ZIP archive integrity: PASS.
- Python syntax compilation (`compileall` on `backend/`): PASS.
- Secret-pattern scan on prepared files: PASS (no matches).
- Frontend install/build/typecheck: BLOCKED. No `node_modules` were included, Yarn was not installed locally, and Corepack could not reach `registry.npmjs.org` from this execution environment.
- Backend pytest collection: BLOCKED because `pytest-xdist` is not installed in this environment. Backend tests also require a running backend and reachable MongoDB.
- Browser E2E, auth, database, and live AI calls: NOT VERIFIED; require installed dependencies and configured external services.

## GitHub status
- Authenticated GitHub profile has access to `Mohanraj360/CPGist` with push/admin permissions.
- That repository is currently empty, default branch `main`, and visibility `public`.
- Because publishing to a public repository requires explicit approval, the prepared source has not been pushed. Confirm whether to push to this public repository as-is, or make/use a private repository first.

## Vercel status and architecture
- Vercel account search found projects `cpgist`, `cpgist-ai`, and `cpgist-ai-re`; all report the Next.js framework preset and existing READY production-target deployments. They are not assumed to be this ZIP's correct target.
- Project detail calls work when no team scope is forced, but the initial explicit team-scoped request returned 403. Existing project ownership/configuration needs confirmation before modifying anything.
- Recommended initial architecture: Vercel for the Vite SPA (`frontend/`, root directory `frontend`) and a separate Python/FastAPI host for `backend/`, with managed MongoDB. Production `/api/*` proxying and cookie/session behavior must be configured and tested after the backend URL is known.
- No `vercel.json` was added because a valid backend destination is not yet known; an invented rewrite would be unsafe and would not make the backend/database deploy by itself.
