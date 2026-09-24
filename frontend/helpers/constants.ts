import { ApplicationSource, ApplicationStatus } from '@/types'

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
