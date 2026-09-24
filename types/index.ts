export type ApplicationStatus =
  | 'applied'
  | 'interview'
  | 'technical_task'
  | 'offer'
  | 'no_answer'
  | 'rejected'

export type ApplicationSource =
  | 'linkedin'
  | 'justjoinit'
  | 'nofluffjobs'
  | 'pracuj'
  | 'company_website'
  | 'other'
  | 'theprotocol'

export interface JobApplication {
  id: string
  company: string
  position: string
  jobUrl?: string
  status: ApplicationStatus
  source: ApplicationSource
  appliedDate: string
  followUpDate?: string
  contactPerson?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type VacancyStatus = 'NEW' | 'SHORTLISTED' | 'DISMISSED' | 'APPLIED'

export type SuggestedResume = 'FULLSTACK' | 'BACKEND' | 'FRONTEND'

// A vacancy found by the ingestion pipeline. `analysis` is typed loosely here —
// its real shape (fitScore, verdict, matchedSkills, ...) is defined in Phase 5
// alongside the zod schema that validates it.
export interface Vacancy {
  id: string
  source: string
  externalId: string
  url: string
  title: string
  company: string
  location?: string
  remote?: boolean
  description: string
  postedAt?: string
  fetchedAt: string
  status: VacancyStatus
  fitScore?: number
  analysis?: Record<string, unknown>
  suggestedResume?: SuggestedResume
  applicationId?: string
  // Output of the cheap rule filter (backend/filter.ts). undefined/null until
  // the filter has run; [] means it ran and found nothing to flag.
  filterReasons?: string[]
  createdAt: string
  updatedAt: string
}

export interface PipelineRun {
  id: string
  startedAt: string
  finishedAt?: string
  source: string
  fetched: number
  newCount: number
  analyzed: number
  errors?: Record<string, unknown>
  tokenUsage?: Record<string, unknown>
}

// A job board the dashboard can search (GET /api/search).
export interface SearchSource {
  name: string
  label: string
}

// What POST /api/search returns once a run finishes.
export interface SearchSummary {
  runId: string
  fetched: number
  newCount: number
  analyzed: number
  errors: number
}

// The candidate profile that drives backend/filter.ts and backend/analyze.ts's
// prompts. Lives here (not backend/profile.ts) because it's a shared
// contract: the frontend interview UI (app/profile/page.tsx) needs the same
// shape as the backend that stores and validates it. See backend/profile.ts
// for the seed data and its zod schema.
export type TargetRole = 'BACKEND' | 'FRONTEND' | 'FULLSTACK' | 'INTERNSHIP'

export interface CandidateProfile {
  level: string
  location: {
    city: string
    country: string
    openToRemote: boolean
  }
  languages: string[]
  // The stack actually used in commercial/project work — this is what
  // vacancy requirements get matched against.
  stack: {
    backend: string[]
    frontend: string[]
    alsoKnows: string[]
  }
  experience: string
  targetRoles: TargetRole[]
  resumeVersions: {
    FULLSTACK: string
    BACKEND: string
    FRONTEND: string
  }
  // Owner explicitly chose visibility over automatic rejection: only a
  // clear title-level mismatch is auto-dismissed. Everything else —
  // required years above the soft limit, partial stack overlap, a
  // language gap — is flagged, not silently dropped, so the owner
  // reviews it themselves. The filter must respect this: flag, don't
  // dismiss, except for hardRejectTitleKeywords.
  filterPolicy: {
    hardRejectTitleKeywords: string[]
    flagIfRequiredYearsAbove: number
    // Languages/frameworks that signal a genuinely different core stack.
    // A plain "does any stack term overlap" check isn't enough: a Java or
    // Angular vacancy often also mentions generic shared tools (Docker,
    // Git, PostgreSQL, REST API), so it would pass with zero flags.
    // Still only ever a flag, never an auto-reject.
    conflictingStackKeywords: string[]
  }
}
