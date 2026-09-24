// Pure formatter for the notes field a promoted Vacancy prefills onto its
// new JobApplication — pulled out of backend/db.ts's promoteVacancyToApplication.
import type { Prisma } from '@prisma/client'
import type { CandidateProfile } from '@/types'

export function buildPromotionNotes(
  vacancy: {
    source: string
    suggestedResume: string | null
    analysis: Prisma.JsonValue
  },
  profile: CandidateProfile
): string {
  const parts: string[] = [`Promoted from vacancy analysis (source: ${vacancy.source}).`]

  if (vacancy.suggestedResume && vacancy.suggestedResume in profile.resumeVersions) {
    const resumeKey = vacancy.suggestedResume as keyof typeof profile.resumeVersions
    parts.push(`Suggested resume: ${vacancy.suggestedResume} (${profile.resumeVersions[resumeKey]}).`)
  }

  const analysis = vacancy.analysis as { suggestedResumeReason?: string; applyAdvice?: string } | null
  if (analysis?.suggestedResumeReason) parts.push(`Reason: ${analysis.suggestedResumeReason}`)
  if (analysis?.applyAdvice) parts.push(`Apply advice: ${analysis.applyAdvice}`)

  return parts.join(' ')
}
