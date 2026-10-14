# Application Tracker

A personal job-search assistant built with Next.js, Prisma, PostgreSQL and
the Claude API. It interviews you to build a structured profile, then uses
that profile — and only that profile — to write your resume, assess your
English and score how well you fit a vacancy.

## Features

- **Dashboard** (`/`) — application stats and pipeline, the top-scoring
  vacancies awaiting a decision, and the status of your profile, resume
  and English assessment.
- **Profile interview** (`/profile`) — a full AI interview (work history,
  projects, education, languages, goals) that builds a structured profile.
  Every job and project keeps its kind (commercial / internship /
  personal project …) so nothing downstream can overstate experience. A
  follow-up interview fills gaps in a saved profile instead of starting over.
- **Resume** (`/resume`) — a one-page, ATS-friendly English resume
  generated only from the profile, downloaded as PDF via the browser's
  print dialog. Contact details come from a form, never from the LLM.
  Skills the profile doesn't back up are flagged.
- **Vacancy match** (`/vacancies/check`) — paste a vacancy in, get an honest
  fit score, what to close to raise it, and (`/resume/[vacancyId]`) a
  resume tailored to it.
- **English level** (`/english`) — a quiz (scored in code), two writing
  tasks and a short chat, assessed into CEFR levels per skill. The latest
  result feeds the match and the resume.
- **Applications** (`/applications`) — track every application you send:
  company, role, source, status (applied, interview, technical task, offer, rejected, no answer)
  and notes. A promising vacancy can be promoted into an application in
  one click.
- **Sources** (`/sources`) — add job boards for automated collection
  without code: Greenhouse, Lever and Ashby boards, RSS/Atom feeds and
  pages with schema.org JobPosting data, each with its legal basis recorded.

Automated vacancy collection (the job-board pipeline described below) is
still in the code but **off by default** — see `SCRAPING_ENABLED`.
[`docs/PLAN.md`](docs/PLAN.md) is the original feature plan, kept for
history.

## Technical highlights

- **Structured LLM output.** Every Claude call goes through one tool-use
  helper and is validated with zod before anything is saved; a malformed
  answer is an error, not silently stored data.
- **The LLM never invents facts.** Resumes are built only from the saved
  profile, contact details never pass through the model, and skills the
  profile doesn't back up are flagged. Deterministic parts (quiz scoring,
  the rule filter) are plain code, not prompts.
- **Bounded API cost.** A cheap triage model screens vacancies before the
  deep analysis, and deep analyses are capped per day.
- **Polite, auditable data collection.** One shared HTTP client enforces
  `robots.txt` (RFC 9309), rate limits and an honest User-Agent; every
  source must record the terms that allow it.
- **Enforced architecture.** ESLint rules keep `frontend/` and `backend/`
  apart and forbid raw `fetch` in source adapters.
- **Tested.** Unit tests (Vitest) cover the API routes, prompts,
  normalizers, the pipeline and the pure helpers, using fixtures with
  made-up content.

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

5. Run the checks:

```
npm test           # unit tests (Vitest)
npm run lint       # ESLint, including the frontend/backend boundary rules
```

## Access and deploying

The app is single-user: one profile, one set of applications, no accounts.
Everyone who can open an instance sees that owner's profile (with contact
details) and spends their Anthropic API key. So:

- **Using it yourself?** Clone the repo and run your own copy with your own
  database and API key (see Getting started). A fresh copy starts from an
  example profile in `backend/profile/seed.ts` — run the interview on `/profile`
  first, so matches and the resume are about you.
- **Deploying it?** Set `APP_PASSWORD`. Every page then redirects to
  `/login`, and every API route answers 401 without a session (an httpOnly
  cookie, valid 30 days; changing the password signs everyone out). A
  production build *without* `APP_PASSWORD` refuses every request rather
  than run open. `/api/cron/*` keeps its own `CRON_SECRET` check.
- Don't share one deployed instance between several people — it would
  mean one shared profile. Each person runs their own.

## Environment variables

| Variable | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | everything | PostgreSQL connection string |
| `APP_PASSWORD` | any deployed instance | the password for `/login`; leave empty locally — see [Access and deploying](#access-and-deploying) |
| `ANTHROPIC_API_KEY` | every AI feature: profile interview, resume, English assessment, vacancy analysis | from console.anthropic.com; server-side only |
| `CRON_SECRET` | the pipeline endpoint (only with `SCRAPING_ENABLED=true`) | any random string — generate one with `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"` |
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
`backend/vacancies/sources/index.ts`. Every adapter has to declare the same `legal`
record (terms link, note, date checked) or it doesn't compile.

This repository ships the infrastructure without any site-specific
adapters; add sources you are allowed to use. Every source, UI-configured
or code, goes through one shared HTTP client (`backend/vacancies/sources/http.ts`) —
calling `fetch` directly in `backend/vacancies/sources/` is a lint error — that:

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
anything else gets a 401, and it returns 403 unless `SCRAPING_ENABLED=true`.

`.github/workflows/ingest.yml` calls it. Because collection is off by
default, the workflow ships with only `workflow_dispatch` (a manual trigger
from the Actions tab); the 4-hour `schedule` is commented out in the file.

To turn it on after deploying the app:

1. In the GitHub repo → **Settings → Secrets and variables → Actions**, add:
   - `INGEST_URL` — your deployed app's ingest endpoint, e.g.
     `https://your-app.example.com/api/cron/ingest`
   - `CRON_SECRET` — the **same value** you set for `CRON_SECRET` in the
     deployed app's environment variables (not the `.env` file — your
     hosting provider's own env var settings)
2. Deploy the app with `SCRAPING_ENABLED=true`, `CRON_SECRET` (and the
   other variables above) set in its environment.
3. Trigger the workflow manually once from the Actions tab
   (`workflow_dispatch`) to confirm it returns success.
4. Uncomment the `schedule` block in `.github/workflows/ingest.yml` to run
   it every 4 hours.

A run is safe to trigger more than once — an already-ingested vacancy is
never re-fetched, and an already-analyzed one is never re-analyzed (see
`backend/vacancies/pipeline/stages.ts`).

## Project structure

```
app/            Next.js routing only: pages and API route handlers
backend/        server-only code, one folder per feature
  applications/   repository.ts
  auth/           session.ts — APP_PASSWORD sessions (used by middleware.ts)
  english/        assessment.ts, llm.ts, prompts.ts, repository.ts
  profile/        schema.ts, seed.ts, gaps.ts, github.ts, repository.ts
    interview/      interview.ts, prompts.ts
  resume/         content.ts, generate.ts, prompts.ts, service.ts, repository.ts
  vacancies/      repository.ts, promotionNotes.ts
    analysis/       analyze.ts, prompts.ts — LLM triage and deep match analysis
    details/        extract.ts, prompt.ts — fields of a pasted vacancy
    filter/         filter.ts, rules.ts — the free rule-based pre-filter
    pipeline/       stages.ts, run.ts, upsert.ts, scraping.ts, repository.ts
    sources/        adapters, configured.ts, the polite HTTP client, repository.ts
      parsing/        pure normalizers for ATS APIs, feeds and JSON-LD
  shared/         infrastructure used by several features
    db/             prisma.ts — the Prisma client
    llm/            callTool.ts, untrustedData.ts
    http/           userAgent.ts
frontend/       client-only code: components/, hooks/, helpers/
types/          type contracts shared by backend/ and frontend/
middleware.ts   password protection for every page and API route
scripts/        manual CLI entry points (ingest:once, analyze:once)
prisma/         schema and migrations (the Prisma CLI expects them at the root)
docs/           the original feature plan (historical)
```

How the backend is organized:

- **By feature, not by technical layer.** Everything about one feature — its
  schema, database access, LLM call and prompt — sits in one folder, so a
  change to the resume touches `backend/resume/` and nothing else.
- **The same file names in every feature:** `repository.ts` is the only
  place that talks to the database, `prompts.ts` holds prompt text, and
  `schema.ts` / `content.ts` / `assessment.ts` hold zod schemas and pure
  logic that need neither the database nor the LLM.
- **`shared/` has no feature logic** — only the Prisma client, the
  structured-output LLM helper and the outgoing User-Agent.
- **`app/` stays thin:** route handlers parse the request and call
  `backend/`; pages only compose `frontend/` components. Pages never import
  `backend/` (lint error), and neither do `frontend/` files.
- Tests sit next to the file they test (`*.test.ts`).

Imports of a file in the same folder (or below it) are relative
(`./repository`); everything else goes through the `@/` path alias (e.g.
`@/backend/resume/service`, `@/frontend/hooks/useVacancies`, `@/types`). The alias is configured in
`tsconfig.json` and mirrored in `vitest.config.ts`.

## License

[MIT](LICENSE)
