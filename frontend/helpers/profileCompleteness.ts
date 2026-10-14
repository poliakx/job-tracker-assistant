// What a saved profile is still missing for a solid resume and an honest
// match — shown on /profile as a checklist. Pure, so it's easy to test.
import type { CandidateProfile } from '@/types'

export interface CompletenessItem {
  ok: boolean
  label: string
  // Where to fix it: the contact form, or a follow-up interview.
  fix: 'contact' | 'interview'
}

export function profileCompleteness(p: CandidateProfile): CompletenessItem[] {
  const undatedJobs = p.workExperience.filter(w => !w.startDate).length
  // Same bar as backend/profile/gaps.ts, which the follow-up interview asks
  // about: under two concrete achievements, a project gets one generic
  // resume line.
  const thinProjects = p.projects.filter(pr => !pr.description || pr.tech.length === 0 || pr.achievements.length < 2).length
  return [
    { ok: !!p.contact.fullName && !!p.contact.email, label: 'Name and email', fix: 'contact' },
    { ok: !!p.contact.github || !!p.contact.linkedin, label: 'GitHub or LinkedIn link', fix: 'contact' },
    { ok: !!p.headline, label: 'Headline', fix: 'interview' },
    { ok: p.workExperience.length + p.projects.length > 0, label: 'At least one job or project', fix: 'interview' },
    { ok: undatedJobs === 0, label: undatedJobs ? `Dates for ${undatedJobs} job(s)` : 'Dates for every job', fix: 'interview' },
    {
      ok: thinProjects === 0,
      label: thinProjects ? `More detail for ${thinProjects} project(s)` : 'Every project described',
      fix: 'interview',
    },
    { ok: p.education.length > 0, label: 'Education', fix: 'interview' },
    { ok: p.languageLevels.length > 0, label: 'Language levels', fix: 'interview' },
  ]
}
