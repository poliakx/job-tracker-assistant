// Pure helper functions backing backend/vacancies/filter/filter.ts's filterVacancy — pulled
// out so that file reads as a short, readable orchestrator (one rule per
// paragraph) instead of a wall of regex and lookup tables.
import type { CandidateProfile } from '@/types'

// Some Polish job boards store the Polish spelling of a city.
const CITY_ALIASES: Record<string, string[]> = {
  Warsaw: ['Warsaw', 'Warszawa'],
}

export function matchesProfileCity(location: string, city: string): boolean {
  const aliases = CITY_ALIASES[city] ?? [city]
  const lowerLocation = location.toLowerCase()
  return aliases.some(alias => lowerLocation.includes(alias.toLowerCase()))
}

export function hasStackOverlap(text: string, profile: CandidateProfile): boolean {
  const terms = [...profile.stack.backend, ...profile.stack.frontend, ...profile.stack.alsoKnows]
  const lowerText = text.toLowerCase()
  return terms.some(term => lowerText.includes(term.toLowerCase()))
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// A conflicting marker (Java, Angular, ...) can appear even in a vacancy
// that also mentions generic shared tools, which is exactly what let 14
// real Java/.NET/Angular vacancies through the plain overlap check above
// with zero flags — caught reviewing the actual Inbox output.
export function findConflictingStackMarkers(text: string, profile: CandidateProfile): string[] {
  return profile.filterPolicy.conflictingStackKeywords.filter(marker => new RegExp(`\\b${escapeRegExp(marker)}\\b`, 'i').test(text))
}

// Matches "3 lata", "3-letnie", "2+ years", "3 yrs" etc. Approximate on
// purpose: this only ever produces a flag, never a rejection. Only counts
// if "experience"/"doświadczen" appears nearby — otherwise a company's "55
// years in business" blurb gets misread as a 55-year experience requirement
// (a real false positive caught while reviewing real vacancies).
const YEARS_REQUIRED_PATTERN = /(\d+)\s*[-+]?\s*(?:lat(?:a|em|niego|nie|ni)?|rok(?:u)?|years?|yrs?)\b/gi
const EXPERIENCE_CONTEXT_PATTERN = /experience|doświadczen/i
const EXPERIENCE_CONTEXT_WINDOW = 40

export function extractMaxRequiredYears(text: string): number | null {
  let max: number | null = null
  for (const match of text.matchAll(YEARS_REQUIRED_PATTERN)) {
    const index = match.index ?? 0
    const start = Math.max(0, index - EXPERIENCE_CONTEXT_WINDOW)
    const end = Math.min(text.length, index + match[0].length + EXPERIENCE_CONTEXT_WINDOW)
    if (!EXPERIENCE_CONTEXT_PATTERN.test(text.slice(start, end))) continue

    const n = Number(match[1])
    if (!Number.isNaN(n) && (max === null || n > max)) max = n
  }
  return max
}

// Polish adjectives inflect (niemiecki/niemieckiego/niemiecka/...), so these
// match the stem with \w* rather than the exact dictionary form.
export const OTHER_LANGUAGES: { name: string; pattern: RegExp }[] = [
  { name: 'German', pattern: /\b(german|niemieck\w*|deutsch)\b/i },
  { name: 'French', pattern: /\b(french|francusk\w*|français)\b/i },
  { name: 'Spanish', pattern: /\b(spanish|hiszpańsk\w*|español)\b/i },
  { name: 'Italian', pattern: /\b(italian|włosk\w*|italiano)\b/i },
  { name: 'Russian', pattern: /\b(russian|rosyjsk\w*)\b/i },
  { name: 'Chinese', pattern: /\b(chinese|chińsk\w*|mandarin)\b/i },
]
