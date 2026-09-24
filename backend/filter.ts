// Cheap, deterministic pre-filter — no network calls, no LLM, runs before
// the paid LLM analysis (backend/analyze.ts). Per the owner's choice
// (candidateProfile.filterPolicy — see @/types and backend/profile.ts),
// only a clear title-level seniority mismatch is a hard reject; everything
// else here is a *flag*, surfaced in `reasons` for the owner to judge,
// never a silent auto-dismiss. The years-of-experience and language checks
// are best-effort text matching, not real NLP — treat them as hints.
import type { CandidateProfile } from '@/types'
import { extractMaxRequiredYears, findConflictingStackMarkers, hasStackOverlap, matchesProfileCity, OTHER_LANGUAGES } from './helpers/filterHelpers'

export interface FilterableVacancy {
  title: string
  description: string
  location: string | null
  remote: boolean | null
}

export interface FilterResult {
  pass: boolean
  reasons: string[]
}

export function filterVacancy(vacancy: FilterableVacancy, profile: CandidateProfile): FilterResult {
  const titleLower = vacancy.title.toLowerCase()

  // The one hard-reject rule. Everything else below only adds to `reasons`.
  const titleMismatch = profile.filterPolicy.hardRejectTitleKeywords.find(keyword =>
    titleLower.includes(keyword.toLowerCase())
  )
  if (titleMismatch) {
    return { pass: false, reasons: [`title-level mismatch: contains "${titleMismatch}"`] }
  }

  const reasons: string[] = []

  const locationOk =
    matchesProfileCity(vacancy.location ?? '', profile.location.city) ||
    (profile.location.openToRemote && vacancy.remote === true)
  if (!locationOk) {
    reasons.push(`location "${vacancy.location ?? 'unknown'}" doesn't match ${profile.location.city} and isn't marked remote`)
  }

  const combinedText = `${vacancy.title}\n${vacancy.description}`
  const conflicts = findConflictingStackMarkers(combinedText, profile)
  if (conflicts.length > 0) {
    reasons.push(`mentions ${conflicts.join(', ')} — a different core stack than yours (Node.js/React)`)
  } else if (!hasStackOverlap(combinedText, profile)) {
    reasons.push('no obvious overlap with your stack found in the title or description')
  }

  const requiredYears = extractMaxRequiredYears(vacancy.description)
  if (requiredYears !== null && requiredYears > profile.filterPolicy.flagIfRequiredYearsAbove) {
    reasons.push(
      `mentions ~${requiredYears} years of experience, above your soft limit of ${profile.filterPolicy.flagIfRequiredYearsAbove}`
    )
  }

  for (const lang of OTHER_LANGUAGES) {
    const alreadyKnown = profile.languages.some(known => known.toLowerCase() === lang.name.toLowerCase())
    if (!alreadyKnown && lang.pattern.test(vacancy.description)) {
      reasons.push(`mentions ${lang.name}, which isn't in your profile languages`)
    }
  }

  return { pass: true, reasons }
}
