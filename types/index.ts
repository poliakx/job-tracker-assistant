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

// A vacancy as GET /api/vacancies lists it — without the full posting
// text, which GET /api/vacancies/:id returns.
export type VacancySummary = Omit<Vacancy, 'description'>

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

// --- Job sources (/sources) --------------------------------------------

// How a source is read — each one a format the site publishes *for*
// automated reading: an official public API, a feed, or schema.org
// structured data embedded for job aggregators.
export type SourceAccess = 'official-api' | 'feed' | 'structured-data'

// Why a source may be read automatically, recorded by whoever added it.
export interface SourceLegal {
  access: SourceAccess
  // The terms / API documentation page that was checked.
  termsUrl: string
  // What that page says that allows automated access, in the adder's words.
  termsNote: string
  // ISO date the terms were last checked.
  reviewedAt: string
}

// Kinds of source that can be added from /sources without code
// (mirrors the SourceKind enum in prisma/schema.prisma).
export type SourceKind = 'greenhouse' | 'lever' | 'ashby' | 'rss' | 'jsonld'

// One row of GET /api/sources: a code adapter (id null, kind 'code') or a
// source configured in the UI.
export interface SourceInfo {
  id: string | null
  name: string
  label: string
  kind: SourceKind | 'code'
  identifier: string | null
  enabled: boolean
  // Switched off by the DISABLED_SOURCES env var, regardless of `enabled`.
  disabledByEnv: boolean
  legal: SourceLegal
}

export interface SourcesResponse {
  scrapingEnabled: boolean
  sources: SourceInfo[]
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

// The kind of each piece of experience is stored explicitly so nothing
// downstream (analysis, resume) can blur a personal project into
// "commercial experience".
export type WorkKind = 'COMMERCIAL' | 'INTERNSHIP' | 'FREELANCE' | 'VOLUNTEER'
export type ProjectKind = 'PERSONAL' | 'TEAM' | 'ACADEMIC' | 'OPEN_SOURCE' | 'HACKATHON'

export interface WorkEntry {
  title: string
  company: string
  location: string
  kind: WorkKind
  // Free-form, as the candidate said it ("03.2024", "2023", "Present").
  startDate: string
  endDate: string
  description: string
  // Only concrete things the candidate actually described — never invented metrics.
  achievements: string[]
  tech: string[]
}

export interface ProjectEntry {
  name: string
  kind: ProjectKind
  role: string
  description: string
  achievements: string[]
  tech: string[]
  url: string
  // Further links to the same project — e.g. the backend repo when `url`
  // is the frontend one. An app split across repos is still one project.
  links: string[]
}

export interface EducationEntry {
  institution: string
  degree: string
  field: string
  startDate: string
  endDate: string
  details: string
}

export interface CertificationEntry {
  name: string
  issuer: string
  date: string
}

export interface LanguageLevel {
  language: string
  // CEFR (A1–C2) or "native"; as the candidate stated it.
  level: string
}

// Filled in by hand on /profile, never by the LLM — exact values matter
// here (a typo in an email is worse than no resume at all).
export interface ContactInfo {
  fullName: string
  email: string
  phone: string
  linkedin: string
  github: string
  portfolio: string
}

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
  // --- Resume-grade detail (added with the full interview). Old profile
  // rows don't have these; CandidateProfileSchema defaults them to empty.
  contact: ContactInfo
  // e.g. "Junior Full-Stack Developer (Node.js / React)"
  headline: string
  // What the candidate says about themselves and what they're looking for,
  // in their own words — raw material for the resume summary.
  about: string
  workExperience: WorkEntry[]
  projects: ProjectEntry[]
  education: EducationEntry[]
  certifications: CertificationEntry[]
  // Levels for `languages` above (which stays a plain list of names for
  // backend/filter.ts).
  languageLevels: LanguageLevel[]
  workAuthorization: string
  availability: string
}

// --- Resume -----------------------------------------------------------------
// Text sections only. Contact details are rendered straight from
// CandidateProfile.contact, never passed through the LLM.
export interface ResumeContent {
  headline: string
  summary: string
  skills: { category: string; items: string[] }[]
  experience: { title: string; company: string; location: string; period: string; bullets: string[] }[]
  projects: { name: string; url: string; links: string[]; tech: string[]; bullets: string[] }[]
  education: { institution: string; degree: string; period: string; details: string }[]
  certifications: string[]
  languages: string[]
}

export interface Resume {
  id: string
  // null = the base resume; set = tailored to that vacancy.
  vacancyId?: string
  content: ResumeContent
  // For a tailored resume: what was changed vs. the base, and why.
  changes: string[]
  createdAt: string
  updatedAt: string
}

// What GET/POST /api/resume and /api/vacancies/:id/resume return.
export interface ResumeView {
  resume: Resume | null
  contact: ContactInfo
  // Skills on the resume that the profile never mentions — see
  // backend/resume.ts's findUnsupportedSkills. Shown as a warning.
  unsupportedSkills: string[]
  vacancy: { id: string; title: string; company: string } | null
}

// --- English assessment -------------------------------------------------------
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type QuizSkill = 'GRAMMAR' | 'VOCABULARY' | 'READING'

export interface QuizQuestion {
  id: string
  level: CefrLevel
  skill: QuizSkill
  // Short text the question is about (READING only); '' otherwise.
  passage: string
  prompt: string
  options: string[]
  answerIndex: number
  explanation: string
}

export interface WritingTask {
  id: string
  prompt: string
  minWords: number
  maxWords: number
}

export interface EnglishTest {
  questions: QuizQuestion[]
  writingTasks: WritingTask[]
}

export interface QuizScore {
  correct: number
  total: number
  byLevel: Partial<Record<CefrLevel, { correct: number; total: number }>>
  bySkill: Partial<Record<QuizSkill, { correct: number; total: number }>>
}

export interface EnglishAssessmentResult {
  overall: CefrLevel
  skills: {
    grammar: CefrLevel
    vocabulary: CefrLevel
    reading: CefrLevel
    writing: CefrLevel
    interaction: CefrLevel
  }
  // English, 2-4 sentences.
  summary: string
  strengths: string[]
  mistakes: { original: string; correction: string; explanation: string }[]
  recommendations: string[]
}

export interface EnglishAssessment {
  id: string
  overallLevel: CefrLevel
  result: EnglishAssessmentResult
  quizScore: QuizScore
  createdAt: string
}

// One of the owner's GitHub repos, as GET /api/profile/github lists it for
// importing into the profile's projects (backend/github.ts).
export interface GithubRepo {
  name: string
  fullName: string
  url: string
  description: string
  language: string | null
  topics: string[]
  stars: number
  updatedAt: string
  isPrivate: boolean
}
