// The zod schema a stored profile is validated with. The CandidateProfile
// *type* lives in @/types (shared contract with the frontend).
import { z } from 'zod'

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
