# Application Tracker

A personal job-search assistant (Next.js + Prisma + PostgreSQL + Claude):

- **Profile interview** (`/profile`) — a full AI interview (work history,
  projects, education, languages, goals) that builds a structured profile.
  Every job and project keeps its kind (commercial / internship /
  personal project …) so nothing downstream can overstate experience. A
  follow-up interview fills gaps in a saved profile instead of starting over.
- **Resume** (`/resume`) — a one-page, ATS-friendly English resume
  generated only from the profile, downloaded as PDF via the browser's
  print dialog. Contact details come from a form, never from the LLM.
  Skills the profile doesn't back up are flagged.
- **Vacancy match** (`/vacancies`) — paste a vacancy in, get an honest
  fit score, what to close to raise it, and (`/resume/[vacancyId]`) a
  resume tailored to it.
- **English level** (`/english`) — a quiz (scored in code), two writing
  tasks and a short chat, assessed into CEFR levels per skill. The latest
  result feeds the match and the resume.
- **Applications** (`/applications`) — the original tracker.
- **Sources** (`/sources`) — add job boards for automated collection
  without code: Greenhouse, Lever and Ashby boards, RSS/Atom feeds and
  pages with schema.org JobPosting data, each with its legal basis recorded.

Automated vacancy collection (the job-board pipeline described below) is
still in the code but **off by default** — see `SCRAPING_ENABLED`. See
`PLAN.md` for the original feature plan.

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
| `SCRAPER_CONTACT_EMAIL` | job sources | contact address sent in the User-Agent so site owners can reach you |
| `DISABLED_SOURCES` | job sources | comma-separated source names to switch off without a code change |
| `SCRAPING_ENABLED` | job sources | `true` turns automated collection (cron endpoint, search API) back on; anything else keeps it off |

## Job sources and responsible data collection

> Off by default: with `SCRAPING_ENABLED` unset, `/api/cron/ingest` and
> `POST /api/search` return 403 and the scheduled workflow is removed.
> Everything below applies only if you turn it back on.

There are two ways to add a job source.

**From the UI (`/sources`), no code.** Only formats a site publishes *for*
automated reading are offered:

| Type | You enter | Why it's a clean source |
|---|---|---|
| Greenhouse / Lever / Ashby | the company's board name | the applicant tracking system's public job-board API, meant for listing a company's openings anywhere |
| RSS / Atom | the feed URL | a feed exists to be read by programs |
| Page with JobPosting data | the page URL | schema.org JobPosting markup, which sites add for Google for Jobs and other aggregators |

There is deliberately no "scrape any HTML page" option. A source can't be
saved without a link to the terms (or API documentation) you checked, a
note on what in them allows automated access, and an explicit
confirmation; `robots.txt` is checked for the exact URL a run will fetch
before the source is saved. Feed and page URLs must be public `https://`
addresses (no localhost or IP addresses). Sources can be switched off or
deleted on the same page; vacancies they already found are kept.

**As a code adapter**, for a site with its own API or data format — see
[CONTRIBUTING.md](CONTRIBUTING.md) and the checklist in
`backend/sources/index.ts`. Every adapter has to declare the same `legal`
record (terms link, note, date checked) or it doesn't compile.

This repository ships the infrastructure without any site-specific
adapters; add sources you are allowed to use. Every source, UI-configured
or code, goes through one shared HTTP client (`backend/sources/http.ts`) —
calling `fetch` directly in `backend/sources/` is a lint error — that:

- checks `robots.txt` before every request (RFC 9309 matching in
  `robots.ts`) and refuses disallowed URLs,
- sends an honest User-Agent with a contact address,
- rate-limits requests per source, with a timeout and bounded,
  `Retry-After`-aware retries,
- never tries to get around anti-bot protection.

`robots.txt` is only the first check. Before adding a source, read the
site's terms: prefer official APIs and feeds, and skip any site whose terms
forbid automated access.

> **Your responsibility.** This project is a tool, not legal advice. Whoever
> runs an instance is responsible for making sure each source they add may
> be accessed this way under its terms and the law that applies to them.
> The recorded terms link and note are there to make that check explicit,
> not to replace it.

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
    the profile interview, resume generation, the English test, the
    shared tool-use helper, and their prompts.
  - `backend/resume.ts`, `backend/english.ts` — zod schemas plus the pure
    checks that don't need the LLM (unsupported-skill check, quiz scoring);
    `backend/resumeService.ts` glues resume generation to the DB.
  - `backend/scraping.ts` — the `SCRAPING_ENABLED` switch.
  - `backend/sources/` — job-source adapters, the UI-configured source kinds
    (`configured.ts`) and the shared polite HTTP client.
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
