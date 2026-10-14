// Shared contract every job-board adapter implements. Keeping this
// separate from the adapters lets Phase 4+ (filter, analyze, ingest)
// depend on RawVacancy without caring which site it came from.
import type { SourceLegal } from '@/types'

export type RawVacancy = {
  source: string
  externalId: string
  url: string
  title: string
  company: string
  location: string
  remote: boolean
  description: string
  postedAt: Date | null
}

export interface VacancySource {
  name: string
  // Human-readable name for the UI's search buttons (e.g. "example.com").
  label: string
  // Why this source may be read automatically. Required on every source,
  // code adapter or UI-configured, so the justification sits next to the
  // code that does the fetching — see the checklist in ./index.ts.
  legal: SourceLegal
  fetchRecent(): Promise<RawVacancy[]>
}
