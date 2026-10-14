import { ApplicationSource, ApplicationStatus, SourceAccess, SourceKind } from '@/types'

// Single source of truth for status/source labels — used by the form, filters,
// and the inline status picker so adding/renaming a value only happens here.
export const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'technical_task', label: 'Technical task' },
  { value: 'offer', label: 'Offer' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'rejected', label: 'Rejected' },
]

export const SOURCE_OPTIONS: { value: ApplicationSource; label: string }[] = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'justjoinit', label: 'JustJoinIT' },
  { value: 'nofluffjobs', label: 'NoFluffJobs' },
  { value: 'pracuj', label: 'Pracuj' },
  { value: 'company_website', label: 'Company website' },
  { value: 'other', label: 'Other' },
  { value: 'theprotocol', label: 'theprotocol.it' },
]

export const STATUS_LABEL: Record<ApplicationStatus, string> = STATUS_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<ApplicationStatus, string>
)

// If an application is still "applied" this many days after appliedDate,
// it's auto-marked "no_answer" (see useApplications).
export const NO_ANSWER_AFTER_DAYS = 7

// Kinds of job source that can be added on /sources (the backend checks
// them again in backend/vacancies/sources/configured.ts). `docsUrl` is the API's own
// documentation — a sensible default for the terms link, which the user
// still has to read and confirm.
export const SOURCE_KIND_OPTIONS: {
  value: SourceKind
  label: string
  identifierLabel: string
  placeholder: string
  hint: string
  docsUrl?: string
}[] = [
  {
    value: 'greenhouse',
    label: 'Greenhouse job board',
    identifierLabel: 'Board name',
    placeholder: 'acme',
    hint: 'The part after boards.greenhouse.io/ or job-boards.greenhouse.io/ in the company’s careers link.',
    docsUrl: 'https://developers.greenhouse.io/job-board.html',
  },
  {
    value: 'lever',
    label: 'Lever job board',
    identifierLabel: 'Company name',
    placeholder: 'acme',
    hint: 'The part after jobs.lever.co/ in the company’s careers link.',
    docsUrl: 'https://github.com/lever/postings-api',
  },
  {
    value: 'ashby',
    label: 'Ashby job board',
    identifierLabel: 'Board name',
    placeholder: 'acme',
    hint: 'The part after jobs.ashbyhq.com/ in the company’s careers link.',
    docsUrl: 'https://developers.ashbyhq.com/docs/public-job-posting-api',
  },
  {
    value: 'rss',
    label: 'RSS / Atom feed',
    identifierLabel: 'Feed URL',
    placeholder: 'https://example.com/jobs/feed.xml',
    hint: 'A feed of job offers the site publishes. Look for an RSS icon or a “feed” link.',
  },
  {
    value: 'jsonld',
    label: 'Page with JobPosting data',
    identifierLabel: 'Page URL',
    placeholder: 'https://example.com/careers',
    hint: 'A careers page that embeds schema.org JobPosting data (what sites add for Google for Jobs).',
  },
]

export const SOURCE_ACCESS_LABEL: Record<SourceAccess, string> = {
  'official-api': 'Official public API',
  feed: 'Published feed',
  'structured-data': 'Structured data',
}
