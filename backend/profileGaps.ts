// What a saved profile is still missing for a strong resume, as concrete
// things for the follow-up interview to ask about (backend/llm/prompts/
// interview.ts). Worked out in code rather than left to the model, so a
// thin project or a missing section is never skipped. Pure — no I/O.
import type { CandidateProfile, EnglishAssessmentResult } from '@/types'

// Fewer concrete achievements than this and a project gets one generic
// bullet on the resume.
const MIN_PROJECT_ACHIEVEMENTS = 2

export function findProfileGaps(profile: CandidateProfile, english: EnglishAssessmentResult | null = null): string[] {
  const gaps: string[] = []

  if (profile.workExperience.length === 0) {
    gaps.push(
      'No work experience is listed. Ask whether they have had any paid work, freelance or client work, an ' +
        'internship or volunteering — even short, part-time or outside IT — with dates. If there was none, accept ' +
        'that and move on; never reframe a project as a job.'
    )
  }

  if (profile.education.length === 0) {
    gaps.push(
      'No education is listed. Ask for school or university (also unfinished or in progress), the field and the ' +
        'years, and any courses, bootcamps or certificates.'
    )
  }

  for (const project of profile.projects) {
    if (!project.description || project.achievements.length < MIN_PROJECT_ACHIEVEMENTS) {
      gaps.push(
        `Project "${project.name}" has too little detail for more than a generic resume line. Ask what exactly ` +
          'they built in it, the hardest technical problem they solved, and anything concrete that came out of it ' +
          '(it was used by a client, by real users, a measurable result). Also ask whether it was for a client ' +
          '(then it may be freelance work) or a personal project.'
      )
    }
  }

  if (profile.languageLevels.length === 0) {
    gaps.push('No language levels are listed. Ask for the level of each language they speak (native, C1, B2, …).')
  }

  if (english) {
    const stated = profile.languageLevels.find(l => l.language.toLowerCase() === 'english')?.level
    if (stated?.toUpperCase() !== english.overall) {
      gaps.push(
        `The app's English test measured ${english.overall}${stated ? `, while the profile says ${stated}` : ''}. ` +
          'The resume uses the measured level. Mention this once, and that they can retake the English test if ' +
          'they think it is higher — do not change the level yourself.'
      )
    }
  }

  return gaps
}
