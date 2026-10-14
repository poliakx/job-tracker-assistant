// Registry of every job source. The search API, the cron endpoint,
// `npm run ingest:once` and the dashboard's per-source buttons all go
// through getSources(), so a source is picked up everywhere automatically.
// There are two kinds:
// - code adapters, listed in `allSources` below;
// - sources added from /sources without code (Greenhouse, Lever, Ashby,
//   RSS/Atom, JSON-LD pages), stored as SourceConfig rows and built by
//   ./configured.ts. Prefer this whenever the site offers one of those.
//
// Adding a code adapter (see CONTRIBUTING.md for the full checklist):
// 1. Check the site may be used at all (docs/PLAN.md rule 9): its robots.txt
//    allows the pages you need for our User-Agent, and its terms don't
//    forbid automated access. No LinkedIn; never work around anti-bot
//    protection. If it isn't allowed, skip the site.
// 2. Inspect the real responses (rule 8). Prefer structured data: a public
//    API, `__NEXT_DATA__` (extractNextData) or JSON-LD JobPosting
//    (extractJobPostings) — see ./html.ts.
// 3. Create ./<name>.ts implementing VacancySource, including `legal`:
//    the terms page you checked and what in it allows automated access.
//    Do every request through createPoliteClient (./http.ts) — it enforces
//    robots.txt, the User-Agent, delays and retries. Calling fetch directly
//    here is a lint error. Parse responses with zod, normalize into
//    RawVacancy, and skip externalIds already stored (hasVacancy) before
//    fetching detail pages.
// 4. Put pure normalizers in backend/vacancies/sources/parsing/ and test them against
//    fixtures in ./__fixtures__/ shaped like the real responses but with
//    made-up content — never commit a site's actual listings.
// 5. Append the adapter to `allSources` below.
//
// DISABLED_SOURCES (comma-separated names, e.g. "greenhouse") switches a
// source off without a code change — handy when a site breaks or objects.
// UI-configured sources can also be switched off on /sources.
import { getEnabledSourceConfigs, getSourceConfigs } from './repository'
import type { SourceInfo } from '@/types'
import { buildConfiguredSource } from './configured'
import type { VacancySource } from './types'

export const allSources: VacancySource[] = []

function disabledNames(disabledEnv: string | undefined): Set<string> {
  return new Set(
    (disabledEnv ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  )
}

export function enabledSources(all: VacancySource[], disabledEnv: string | undefined): VacancySource[] {
  const disabled = disabledNames(disabledEnv)
  return all.filter(s => !disabled.has(s.name))
}

// Every source a run may use: code adapters plus enabled UI-configured
// ones, minus DISABLED_SOURCES.
export async function getSources(): Promise<VacancySource[]> {
  const configured = (await getEnabledSourceConfigs()).map(buildConfiguredSource)
  return enabledSources([...allSources, ...configured], process.env.DISABLED_SOURCES)
}

export async function findSource(name: string): Promise<VacancySource | undefined> {
  return (await getSources()).find(s => s.name === name)
}

// Everything /sources shows, including switched-off sources.
export async function listSourceInfo(): Promise<SourceInfo[]> {
  const disabled = disabledNames(process.env.DISABLED_SOURCES)
  const code: SourceInfo[] = allSources.map(s => ({
    id: null,
    name: s.name,
    label: s.label,
    kind: 'code',
    identifier: null,
    enabled: true,
    disabledByEnv: disabled.has(s.name),
    legal: s.legal,
  }))
  const configured: SourceInfo[] = (await getSourceConfigs()).map(row => {
    const source = buildConfiguredSource(row)
    return {
      id: row.id,
      name: source.name,
      label: row.label,
      kind: row.kind,
      identifier: row.identifier,
      enabled: row.enabled,
      disabledByEnv: disabled.has(source.name),
      legal: source.legal,
    }
  })
  return [...code, ...configured]
}
