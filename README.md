# Application Tracker

A personal job-application tracker (Next.js + Prisma + PostgreSQL), plus a
vacancy discovery pipeline that finds, filters and analyzes junior
developer vacancies against your profile. See `PLAN.md` for the full
feature plan.

## Getting started

1. Install dependencies:

```
npm install
```

2. Copy `.env.example` to `.env` and fill in the values (see below).

3. Run the initial database migration:

```
npx prisma migrate dev
```

4. Run development server:

```
npm run dev
```

## Environment variables

| Variable | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | everything | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | vacancy analysis | from console.anthropic.com; server-side only |
| `CRON_SECRET` | the scheduled pipeline endpoint | any random string — generate one with `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"` |
| `ANALYSIS_MODEL_TRIAGE` / `ANALYSIS_MODEL_DEEP` | vacancy analysis | model IDs for the cheap triage pass and the deep analysis pass |
| `ANALYSIS_DAILY_CAP` | vacancy analysis | max deep analyses per calendar day, to bound API cost |

## Manual pipeline scripts

Useful for testing without waiting for the schedule:

```
npm run ingest:once            # fetch new vacancies + run the rule filter
npm run analyze:once [batch]   # run LLM triage + deep analysis (default batch: 8)
```

## Scheduled pipeline (GitHub Actions)

`app/api/cron/ingest/route.ts` runs one bounded batch of ingest → filter →
analyze per call, and requires `Authorization: Bearer <CRON_SECRET>` —
anything else gets a 401. `.github/workflows/ingest.yml` calls it every 4
hours, plus `workflow_dispatch` for a manual trigger from the Actions tab.

To set this up after deploying the app:

1. In the GitHub repo → **Settings → Secrets and variables → Actions**, add:
   - `INGEST_URL` — your deployed app's ingest endpoint, e.g.
     `https://your-app.example.com/api/cron/ingest`
   - `CRON_SECRET` — the **same value** you set for `CRON_SECRET` in the
     deployed app's environment variables (not the `.env` file — your
     hosting provider's own env var settings)
2. Deploy the app with `CRON_SECRET` (and the other variables above) set
   in its environment.
3. Trigger the workflow manually once from the Actions tab
   (`workflow_dispatch`) to confirm it returns success before waiting for
   the schedule.

A run is safe to trigger more than once — an already-ingested vacancy is
never re-fetched, and an already-analyzed one is never re-analyzed (see
`backend/pipeline.ts`).

## Project structure

- `app/` — Next.js routing only (pages and API route handlers), kept thin;
  each one delegates to `backend/`.
- `backend/` — server-only logic, grouped by purpose:
  - `backend/db/` — Prisma client + all query functions.
  - `backend/llm/` — everything that calls Claude: vacancy analysis,
    the profile interview, the shared tool-use helper, and their prompts.
  - `backend/sources/` — job-source adapters and the shared polite HTTP client.
  - `backend/ingest/` — dedup insert into the database.
  - `backend/helpers/` — pure functions pulled out of the files above.
  - `backend/pipeline.ts`, `backend/filter.ts`, `backend/profile.ts` —
    the orchestrator, the rule filter, and the seed profile data; each
    is its own single-purpose concern, not part of a bigger cluster.
- `frontend/` — client-only logic: React hooks (`frontend/hooks/`) and
  browser-side helpers (`frontend/helpers/`: localStorage, constants,
  relative-time formatting). UI components live in
  `frontend/components/`.
- `types/` — shared type contracts (`JobApplication`, `Vacancy`,
  `CandidateProfile`, ...) imported by both `backend/` and `frontend/`.
- `scripts/` — manual CLI entry points (`ingest:once`, `analyze:once`).
- `prisma/` — schema and migrations (kept at the root; the Prisma CLI
  expects it there).

Imports across these boundaries use the `@/` path alias (e.g.
`@/backend/db`, `@/frontend/hooks/useVacancies`, `@/types`) instead of
relative paths, configured in `tsconfig.json` and mirrored in
`vitest.config.ts`.
