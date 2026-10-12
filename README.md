# CPGist

CPGist is a CPG/FMCG analytics application with a React frontend, a FastAPI backend, MongoDB persistence, account sessions, contact/data-deletion flows, and an AI Analyst endpoint.

## Architecture

- `frontend/` — React 19 + TypeScript + Vite 8 + Tailwind CSS v4 SPA. Vite proxies `/api` to `http://localhost:8001` during development.
- `backend/` — FastAPI application (`backend/server.py`) with `/api` routes, MongoDB access through Motor, password/Google-session authentication, workspace overview, contact and data-deletion requests, and AI Analyst integration.
- `tests/` — Playwright configuration and helpers. Browser specs belong in `tests/e2e/`.
- `backend/tests/` — pytest API tests.

The backend is a separate service, not a static frontend bundle. Vercel can host the Vite frontend; the FastAPI service and MongoDB must also be hosted and configured. Do not deploy only `frontend/` and assume API/auth/database features will work.

## Prerequisites

- Node.js 22 or a version compatible with the pinned Vite toolchain
- Yarn Classic (the frontend and test workspaces include `yarn.lock`)
- Python 3.11+ (use a version supported by the pinned dependencies)
- MongoDB, preferably a managed MongoDB Atlas cluster for hosted environments

## Local development

1. Configure the backend:

   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your MongoDB URI, database name, and optional AI key.
   python -m venv .venv
   # Windows: .venv\\Scripts\\activate
   # macOS/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn server:app --host 127.0.0.1 --port 8001 --reload
   ```

2. In another terminal, install and run the frontend:

   ```bash
   cd frontend
   yarn install --frozen-lockfile
   yarn dev
   ```

3. Open `http://localhost:3000`. The Vite dev server proxies `/api/*` to the backend on port 8001.

## Environment variables

Configure backend variables in `backend/.env` locally and in the backend hosting provider for deployed environments. Never commit `.env` files.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URL` | Yes | MongoDB connection string from your MongoDB provider |
| `DB_NAME` | Yes | MongoDB database name, e.g. `cpgist` |
| `CORS_ORIGINS` | Recommended | Comma-separated allowed origins for direct browser-to-backend calls |
| `EMERGENT_LLM_KEY` | For live AI | Enables the live AI Analyst endpoint; obtain from the relevant Emergent integration/account |
| `APP_TZ` | Optional | Timezone used by date helpers |
| `BACKEND_URL` | Tests only | API base URL for pytest; defaults are defined in `backend/tests/conftest.py` |
| `TEST_PASSWORD` | Tests only | Optional test-only password setting if referenced by test code |

There are currently no `import.meta.env` frontend environment references in the source scanned for this audit. The frontend API helper uses relative `/api` paths, so production routing must proxy those paths to the hosted FastAPI backend.

## Database

The backend creates indexes at startup in `backend/lib/db.py`, including unique indexes for user IDs/emails/session tokens and a TTL index for session expiration. There are no versioned database migration files or production seed scripts in this archive. The app expects MongoDB connectivity and creates collections/indexes as routes are used and startup indexes are applied.

Before pointing this app at an existing database, back it up and review index conflicts. Do not drop or reset the database as part of deployment.

## Build and checks

Frontend:

```bash
cd frontend
yarn install --frozen-lockfile
yarn typecheck
yarn lint
yarn build
```

Backend:

```bash
cd backend
pip install -r requirements.txt
pytest
```

The API tests expect a running backend and reachable MongoDB. A frontend build alone does not verify authentication, AI calls, or database-backed routes.

## Deployment outline

1. Deploy `backend/` as a Python/FastAPI web service with a persistent managed MongoDB connection.
2. Set `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, and (if live AI is required) `EMERGENT_LLM_KEY` in the backend host's secret settings.
3. Deploy `frontend/` to Vercel with **Root Directory** set to `frontend`, Framework Preset `Vite`, install command `yarn install --frozen-lockfile`, and build command `yarn build`.
4. Configure a Vercel rewrite for `/api/:path*` to the backend URL, or update the API layer to use a configured API origin. Validate cookie/session behavior before production traffic.
5. Set production origins carefully. Authentication uses an HTTP-only secure session cookie; verify cookie attributes and proxy behavior in the actual production domains.
6. Verify `/api/auth/session`, `/api/workspace/overview` (unauthenticated should return 401), `/api/contact/leads`, and `/api/analyst/ask` with the required service credentials.

No production deployment is considered complete until backend, database, auth, and AI workflows have been tested against the deployed services.

## Security notes

- Keep `.env`, credentials, tokens, and real customer data out of Git.
- Use a dedicated least-privilege MongoDB database user and TLS connection.
- Configure CORS to known origins; do not use broad origins for a credentialed browser setup.
- Do not expose `EMERGENT_LLM_KEY` or MongoDB credentials to the frontend.
- The sample analytics preview is explicitly illustrative. Do not present it as real customer or syndicated retail data.
