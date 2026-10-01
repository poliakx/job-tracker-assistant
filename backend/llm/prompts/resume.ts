// Named prompt constants/builders for backend/llm/resume.ts.
import type { CandidateProfile, EnglishAssessmentResult } from '@/types'
import { UNTRUSTED_DATA_NOTICE } from './analyze'

const RESUME_RULES = `The candidate profile is the only source of truth. This is a real person's resume: \
anything you add that isn't in the profile is a lie they'll be caught in during an interview.

- Never add a skill, technology, employer, title, date, degree, certificate or number that isn't in the profile. \
  Rephrasing is fine; inventing is not. Only quantify an achievement if the number is in the profile.
- Experience section: only the profile's workExperience entries. Make the kind visible where the title doesn't \
  already: an INTERNSHIP reads as an internship ("Backend Developer Intern"), FREELANCE as "(Freelance)", \
  VOLUNTEER as "(Volunteer)".
- Projects section: the profile's projects. Never present a project as a job. For a TEAM project, make the \
  candidate's own part clear.
- period: "MM.YYYY – MM.YYYY" (or "– Present") built from the profile's dates as given; empty if there are none.
- Bullets: start with a strong verb, one line each where possible, concrete over generic. At most 4 per job and \
  3 per project. No buzzword filler ("passionate", "hard-working", "team player").
- summary: 2-3 sentences, specific to this candidate's actual stack and experience, honest about level.
- skills: grouped into a few categories (e.g. Languages, Backend, Frontend, Databases, Tools), only items from \
  the profile's stack and tech lists.
- languages: one string per language, e.g. "English — B2", from the profile's language levels.
- Keep it to one page: with many projects, include the strongest 3-4.
- Write everything in English.`

function formatEnglish(english: EnglishAssessmentResult | null): string {
  if (!english) return ''
  return (
    `\n\nMeasured English level (from the app's English test — use this for English in languages, it overrides a ` +
    `self-stated level): ${english.overall}`
  )
}

function profileJson(profile: CandidateProfile): string {
  // Contact details are rendered separately and never needed here;
  // filterPolicy is search plumbing, not resume material.
  const { contact: _contact, filterPolicy: _filterPolicy, ...rest } = profile
  return JSON.stringify(rest, null, 2)
}

export function buildBaseResumeSystemPrompt(profile: CandidateProfile, english: EnglishAssessmentResult | null): string {
  return [
    "You write a one-page, ATS-friendly resume for a junior software developer from their profile. It's the " +
      'general-purpose version, aimed at the target roles in the profile.',
    '',
    RESUME_RULES,
    '',
    'changes: return an empty array (this is the base version).',
    '',
    'Candidate profile:',
    profileJson(profile) + formatEnglish(english),
  ].join('\n')
}

export function buildTailoredResumeSystemPrompt(profile: CandidateProfile, english: EnglishAssessmentResult | null): string {
  return [
    "You tailor a one-page, ATS-friendly resume for a junior software developer to one specific vacancy, from " +
      'their profile.',
    '',
    RESUME_RULES,
    '',
    'Tailoring means choosing and ordering, not adding:',
    "- Put the skills, jobs' bullets and projects most relevant to this vacancy first; drop the least relevant " +
      'project if space is tight.',
    "- Where the profile describes the same thing the vacancy asks for in different words, use the vacancy's " +
      'wording (e.g. "RESTful services" for "REST API") — only when it is genuinely the same thing.',
    '- Aim the headline and summary at this role.',
    "- A requirement the candidate doesn't meet stays off the resume. It is a gap to close, not a line to add.",
    '',
    'changes: 3-6 short items in Ukrainian saying what you emphasized, reordered or reworded for this vacancy and ' +
      'why. If an important requirement could not be addressed because the profile lacks it, say so as one item.',
    '',
    'Candidate profile:',
    profileJson(profile) + formatEnglish(english),
    '',
    UNTRUSTED_DATA_NOTICE,
  ].join('\n')
}
