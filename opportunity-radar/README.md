# Opportunity Radar · Stage 1

A job and internship discovery product for college students. This commit builds **Stage 1 only**, as requested: React frontend, FastAPI backend, persistent SQLite and ChromaDB, and the basic job model. Stop here to verify the foundation before connecting the first real source.

## What works now

- Responsive dashboard, database connection indicator, current/new/closed views, exact filters, pagination, and job details with original source links.
- Read-only job API and database-backed counts. A fresh database contains **zero jobs**. No old datasets, invented listings, match scores, or simulated refreshes.
- Job lifecycle fields, source identity uniqueness, discovery timestamps, original URL, deadline, content hash, and verification timestamps.
- Persistent Chroma collection initialized on API startup. **Embedding and semantic search are Stage 4**, not implemented yet.
- Closed jobs are excluded from the default feed. A job is labeled verified open only when it is not closed and was verified within the past 24 hours. Stale records say they need a recheck. The 24-hour cutoff is a product policy, not a guarantee the employer has not closed the posting since verification.

## Architecture and important files

```text
opportunity-radar/
  index.html, assets/       built public frontend for GitHub Pages
  frontend/
    src/main.jsx           React dashboard and API calls
    src/styles.css         responsive visual design
    vite.config.js         build with /opportunity-radar/ base path
    package-lock.json      frontend dependency lock
  backend/
    main.py                FastAPI app, startup, health, jobs, statistics
    database.py            SQLAlchemy job model and database sessions
    schemas.py             API shape and verified-open calculation
    config.py              environment and project-relative storage paths
    tests/                 isolated temporary databases; no real jobs seeded
  data/                    ignored SQLite data (created on startup)
  chroma_store/            ignored persistent vectors (created on startup)
  requirements.txt         direct Python dependencies
  requirements.lock.txt    exact tested Python environment
  .env.example             backend configuration, no secrets
```

React + Vite keeps a static frontend compatible with this repository’s other folder-based projects. FastAPI handles structured data through SQLAlchemy so PostgreSQL can replace SQLite later. Chroma stays on the backend. The browser never reads database files. There is no need for a paid service or API key in Stage 1.

## Run locally

Use **Python 3.12** (tested) and **Node 22.12+ or 24**. In a terminal:

```sh
git clone https://github.com/kadiekeslar/kadiekeslar.github.io.git
cd kadiekeslar.github.io/opportunity-radar
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.lock.txt
cp .env.example .env
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal, from the same `opportunity-radar` folder:

```sh
cd frontend
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/opportunity-radar/**. The development frontend defaults to `http://127.0.0.1:8000`. The footer should say **Backend connected**. Counts should be **0**, and the feed should explain that the first source is not yet connected.

API documentation: **http://127.0.0.1:8000/docs**. Quit a server with Ctrl+C. Restarting the API preserves both databases.

## Small verification test

With the backend running:

```sh
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/jobs
```

Expect `status: "ok"`, both databases connected, zero embedded jobs and connected sources, and `{"items":[],"total":0}`. No fake jobs should appear. A missing job ID returns 404.

Run the automated checks from `opportunity-radar/` with the virtual environment active:

```sh
python -m pytest backend/tests -q
cd frontend
npm run build
```

The tests use temporary fixture records and verify persistence, source identity uniqueness, pagination, filters, closed-job exclusion, and stale verification. They do not contact company websites or put fixtures in your real database.

## Stage 1 API

| Endpoint | Behavior |
| --- | --- |
| `GET /health` | Checks SQL and Chroma; reports Stage 1 and no connected sources |
| `GET /jobs` | Current stored jobs, excluding closed |
| `GET /jobs/new` | Jobs with lifecycle status NEW |
| `GET /jobs/{id}` | Job detail, original URL, timestamps, and verification |
| `GET /stats` | Database counts; "today" starts at midnight UTC |

`/jobs` accepts `status=current|NEW|OPEN|CLOSED`, exact `company`, `location`, and `employment_type`, plus `limit` (1–100) and `offset`. NEW means the lifecycle status, while “discovered today” uses `first_seen_at`. Stage 3 defines the transition from NEW to OPEN. The default API may return stale current records so the UI can explicitly label them; they do not count as verified open.

No public job-write, account, tracker, resume, matching, recommendations, opening predictions, source collection, or scheduled refresh endpoints are claimed in Stage 1. These follow the stages in the original brief.

## GitHub Pages and later deployment

The public frontend lives at **https://kadiekeslar.github.io/opportunity-radar/** alongside `crossy-road/` and `scripture-graph/`. `npm run build` writes `index.html` and `assets/` into this project’s root; commit those generated files together with the source. It does not replace the portfolio homepage or other projects. No repository-wide Pages workflow changes are needed for the existing branch-based setup.

**GitHub Pages cannot run Python or persistent databases.** Until a separate backend is hosted, the public page shows “Backend not connected” and unknown counts, not a pretend live feed. Running the local API connects the local development site, not all public visitors.

When ready for deployment in Stage 10:

1. Deploy the Python API on a service with a persistent disk; keep SQLite and Chroma data on that disk. Do not use an ephemeral serverless filesystem. Run one API process while using this simple local-storage architecture.
2. Set `DATABASE_URL`, `CHROMA_PATH`, and `CORS_ORIGINS` on that host. The public frontend origin is `https://kadiekeslar.github.io` (no path). Keep secrets on the backend. SQLite is fine for this first version; PostgreSQL requires a driver and later schema migrations.
3. Copy `frontend/.env.example` to `frontend/.env.local`, set `VITE_API_URL=https://your-api-host`, run `npm run build`, and commit the updated root `index.html` and generated assets. VITE values are public; never put credentials in them.
4. In Stage 3, add a separate refresh command and scheduler. Page loads must read our database, not scrape ATS providers.

No hosting provider, paid plan, or schedule has been selected or activated.

## Next verification checkpoint

Confirm that you can start both services, see an empty connected dashboard, and pass the tests. **Then Stage 2** connects one real public job source. The roadmap in the UI shows the remaining stages; those features are intentionally not implemented in this first checkpoint.

References: [Vite static deployment](https://vite.dev/guide/static-deploy), [FastAPI databases](https://fastapi.tiangolo.com/tutorial/sql-databases/), [Chroma persistent client](https://docs.trychroma.com/reference/python).
