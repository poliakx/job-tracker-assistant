// The seed/fallback candidate profile. The live profile is stored in the
// database (edited via the interview on /profile — see ./repository.ts);
// this object is used until that row exists, or again if one is ever
// malformed.
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
