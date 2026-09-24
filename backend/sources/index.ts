// Registry of every job-board adapter. The search API, the cron endpoint,
// `npm run ingest:once` and the dashboard's per-source buttons all read
// `sources`, so a registered adapter is picked up everywhere automatically.
//
// Adding a source:
// 1. Check the site may be used at all (PLAN.md rule 9): its robots.txt
//    allows the pages you need for our User-Agent, and its terms don't
//    forbid automated access. No LinkedIn; never work around anti-bot
//    protection. If it isn't allowed, skip the site.
// 2. Inspect the real responses (rule 8). Prefer structured data: a public
//    API, `__NEXT_DATA__` (extractNextData) or JSON-LD JobPosting
//    (extractJobPostings) — see ./html.ts.
// 3. Create ./<name>.ts implementing VacancySource. Do every request
//    through createPoliteClient (./http.ts) — it enforces robots.txt, the
//    User-Agent, delays and retries — and never call fetch directly. Parse
//    responses with zod, normalize into RawVacancy, and skip externalIds
//    already stored (hasVacancy) before fetching detail pages.
// 4. Put pure normalizers in backend/helpers/ and test them against
//    fixtures in ./__fixtures__/ shaped like the real responses but with
//    made-up content — never commit a site's actual listings.
// 5. Append the adapter to `allSources` below.
//
// DISABLED_SOURCES (comma-separated names, e.g. "greenhouse") switches a
// source off without a code change — handy when a site breaks or objects.
import type { VacancySource } from './types'

export const allSources: VacancySource[] = []

export function enabledSources(all: VacancySource[], disabledEnv: string | undefined): VacancySource[] {
  const disabled = new Set(
    (disabledEnv ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  )
  return all.filter(s => !disabled.has(s.name))
}

export const sources: VacancySource[] = enabledSources(allSources, process.env.DISABLED_SOURCES)

export function findSource(name: string): VacancySource | undefined {
  return sources.find(s => s.name === name)
}
