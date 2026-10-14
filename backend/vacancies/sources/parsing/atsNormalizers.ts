// Pure normalizers from the public job-board APIs of applicant tracking
// systems (Greenhouse, Lever, Ashby) into RawVacancy fields. The zod
// schemas live next to the fetching code in backend/vacancies/sources/configured.ts; the
// structural types here are the subset of them these functions read.
import { htmlToText } from './htmlText'

export interface NormalizedPosting {
  externalId: string
  title: string
  company: string
  url: string
  location: string
  remote: boolean
  description: string
  postedAt: Date | null
}

const REMOTE_RE = /remote|zdaln|anywhere/i

function toDate(value: string | number | undefined | null): Date | null {
  if (value === undefined || value === null || value === '') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// --- Greenhouse: GET boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true

export interface GreenhouseJobLike {
  id: number
  title: string
  absolute_url: string
  location?: { name?: string | null } | null
  updated_at?: string | null
  first_published?: string | null
  content?: string | null
  company_name?: string | null
}

export function normalizeGreenhouseJob(job: GreenhouseJobLike, fallbackCompany: string): NormalizedPosting {
  const location = job.location?.name?.trim() || 'Not specified'
  return {
    externalId: String(job.id),
    title: job.title.trim(),
    company: job.company_name?.trim() || fallbackCompany,
    url: job.absolute_url,
    location,
    remote: REMOTE_RE.test(location),
    description: htmlToText(job.content ?? ''),
    postedAt: toDate(job.first_published ?? job.updated_at),
  }
}

// --- Lever: GET api.lever.co/v0/postings/{company}?mode=json

export interface LeverPostingLike {
  id: string
  text: string
  hostedUrl: string
  createdAt?: number | null
  workplaceType?: string | null
  categories?: { location?: string | null; allLocations?: string[] | null } | null
  descriptionPlain?: string | null
  description?: string | null
  lists?: { text?: string | null; content?: string | null }[] | null
  additionalPlain?: string | null
}

export function normalizeLeverPosting(posting: LeverPostingLike, company: string): NormalizedPosting {
  const locations = posting.categories?.allLocations?.length ? posting.categories.allLocations : [posting.categories?.location]
  const location = locations.filter((l): l is string => Boolean(l?.trim())).join(', ') || 'Not specified'
  const sections = [
    posting.descriptionPlain?.trim() || htmlToText(posting.description ?? ''),
    ...(posting.lists ?? []).map(list => [list.text?.trim(), htmlToText(list.content ?? '')].filter(Boolean).join('\n')),
    posting.additionalPlain?.trim(),
  ]
  return {
    externalId: posting.id,
    title: posting.text.trim(),
    company,
    url: posting.hostedUrl,
    location,
    remote: posting.workplaceType === 'remote' || REMOTE_RE.test(location),
    description: sections.filter(Boolean).join('\n\n'),
    postedAt: toDate(posting.createdAt),
  }
}

// --- Ashby: GET api.ashbyhq.com/posting-api/job-board/{board}

export interface AshbyJobLike {
  id: string
  title: string
  jobUrl: string
  location?: string | null
  isRemote?: boolean | null
  workplaceType?: string | null
  publishedAt?: string | null
  descriptionPlain?: string | null
  descriptionHtml?: string | null
}

export function normalizeAshbyJob(job: AshbyJobLike, company: string): NormalizedPosting {
  const location = job.location?.trim() || 'Not specified'
  return {
    externalId: job.id,
    title: job.title.trim(),
    company,
    url: job.jobUrl,
    location,
    remote: job.isRemote === true || /remote/i.test(job.workplaceType ?? '') || REMOTE_RE.test(location),
    description: job.descriptionPlain?.trim() || htmlToText(job.descriptionHtml ?? ''),
    postedAt: toDate(job.publishedAt),
  }
}
