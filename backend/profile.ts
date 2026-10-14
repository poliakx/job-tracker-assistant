// Seed/fallback profile data + its validator. The CandidateProfile *type*
// lives in @/types (shared contract with the frontend interview UI) — this
// file only has backend concerns: the default data and the zod schema that
// validates a Profile row before it's trusted. As of Phase 9, the *live*
// profile is stored in the Profile table (editable via the AI interview at
// /profile — see backend/db.ts's getActiveProfile/saveProfile); the object
// below is used until that row exists, or again if one is ever malformed.
import { z } from 'zod'
import type { CandidateProfile } from '@/types'

// An illustrative example, not a real person: the real profile lives only in
// the database, so nobody's personal details are committed with the code.
export const candidateProfile: CandidateProfile = {
  level:
    'Junior developer; open to Junior, Middle (up to ~2 yrs required experience) and ' +
    'internship roles across backend, frontend and full-stack',
  location: {
    city: 'Warsaw',
    country: 'Poland',
    openToRemote: true,
  },
  languages: ['English', 'Polish'],
  stack: {
    backend: ['Node.js', 'Express', 'PostgreSQL', 'Docker', 'Zod', 'Jest', 'REST API'],
    frontend: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'],
    alsoKnows: ['Python (coursework)'],
  },
  experience:
    '~1.5 years of self-taught programming; a 3-month backend internship (Node.js/PostgreSQL); ' +
    'one solo-built full-stack portfolio project with auth and automated tests.',
  targetRoles: ['BACKEND', 'FRONTEND', 'FULLSTACK', 'INTERNSHIP'],
  resumeVersions: {
    FULLSTACK: 'Node.js/React',
    BACKEND: 'Node.js/PostgreSQL',
    FRONTEND: 'React/TypeScript',
  },
  filterPolicy: {
    hardRejectTitleKeywords: ['senior', 'lead', 'principal', 'staff', 'architect', 'head of'],
    flagIfRequiredYearsAbove: 2,
    conflictingStackKeywords: [
      'Java',
      'Spring Boot',
      'Spring Framework',
      'C#',
      '.NET',
      'ASP.NET',
      'PHP',
      'Laravel',
      'Symfony',
      'Ruby on Rails',
      'Golang',
      'Kotlin',
      'Delphi',
      'Angular',
      'Vue.js',
      'Python',
    ],
  },
  contact: { fullName: '', email: '', phone: '', linkedin: '', github: '', portfolio: '' },
  headline: 'Junior Full-Stack Developer (Node.js / React)',
  about: '',
  workExperience: [],
  projects: [],
  education: [],
  certifications: [],
  languageLevels: [],
  workAuthorization: '',
  availability: '',
}

// Validates a Profile row's `data` JSON before it's trusted as a
// CandidateProfile — a malformed row (e.g. a bug in the interview's
// extraction step) would otherwise throw deep inside the filter or the
// analysis prompts instead of failing safely. Kept in sync with
// CandidateProfile (@/types) by hand, same as backend/analyze.ts's schemas
// alongside their hand-written tool JSON schemas.
// The resume-grade fields came later than the rest: every one of them has a
// default so a profile saved before the full interview existed still
// validates (it just has nothing to put on a resume yet).
const str = z.string().default('')
const strList = z.array(z.string()).default([])

export const ContactInfoSchema = z.object({
  fullName: str,
  email: str,
  phone: str,
  linkedin: str,
  github: str,
  portfolio: str,
})

const WorkEntrySchema = z.object({
  title: z.string(),
  company: z.string(),
  location: str,
  kind: z.enum(['COMMERCIAL', 'INTERNSHIP', 'FREELANCE', 'VOLUNTEER']),
  startDate: str,
  endDate: str,
  description: str,
  achievements: strList,
  tech: strList,
})

const ProjectEntrySchema = z.object({
  name: z.string(),
  kind: z.enum(['PERSONAL', 'TEAM', 'ACADEMIC', 'OPEN_SOURCE', 'HACKATHON']),
  role: str,
  description: str,
  achievements: strList,
  tech: strList,
  url: str,
  links: strList,
})

const EducationEntrySchema = z.object({
  institution: z.string(),
  degree: str,
  field: str,
  startDate: str,
  endDate: str,
  details: str,
})

const CertificationEntrySchema = z.object({ name: z.string(), issuer: str, date: str })

const LanguageLevelSchema = z.object({ language: z.string(), level: z.string() })

export const CandidateProfileSchema = z.object({
  level: z.string(),
  location: z.object({
    city: z.string(),
    country: z.string(),
    openToRemote: z.boolean(),
  }),
  languages: z.array(z.string()),
  stack: z.object({
    backend: z.array(z.string()),
    frontend: z.array(z.string()),
    alsoKnows: z.array(z.string()),
  }),
  experience: z.string(),
  targetRoles: z.array(z.enum(['BACKEND', 'FRONTEND', 'FULLSTACK', 'INTERNSHIP'])),
  resumeVersions: z.object({
    FULLSTACK: z.string(),
    BACKEND: z.string(),
    FRONTEND: z.string(),
  }),
  filterPolicy: z.object({
    hardRejectTitleKeywords: z.array(z.string()),
    flagIfRequiredYearsAbove: z.number(),
    conflictingStackKeywords: z.array(z.string()),
  }),
  contact: ContactInfoSchema.default({ fullName: '', email: '', phone: '', linkedin: '', github: '', portfolio: '' }),
  headline: str,
  about: str,
  workExperience: z.array(WorkEntrySchema).default([]),
  projects: z.array(ProjectEntrySchema).default([]),
  education: z.array(EducationEntrySchema).default([]),
  certifications: z.array(CertificationEntrySchema).default([]),
  languageLevels: z.array(LanguageLevelSchema).default([]),
  workAuthorization: str,
  availability: str,
})
