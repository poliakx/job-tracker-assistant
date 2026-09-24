// Shared contract every job-board adapter implements. Keeping this
// separate from the adapters lets Phase 4+ (filter, analyze, ingest)
// depend on RawVacancy without caring which site it came from.

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
  fetchRecent(): Promise<RawVacancy[]>
}
