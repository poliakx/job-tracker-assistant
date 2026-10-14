// Pure type-narrowing helpers for Vacancy.analysis — pulled out of
// VacancyCard so the component only deals with already-narrowed data.
import type { Vacancy } from '@/types'

// Deep analysis result (see backend/vacancies/analysis/analyze.ts's DeepAnalysisSchema) —
// Vacancy.analysis is typed loosely (Record<string, unknown>) since it can
// also hold a triage-only rejection or nothing at all; narrow it here at
// render time.
export interface DeepAnalysisView {
  verdict: 'STRONG' | 'MAYBE' | 'WEAK'
  summary: string
  matchedSkills: string[]
  missingSkills: string[]
  redFlags: string[]
  suggestedResumeReason?: string
  applyAdvice?: string
  // Absent on analyses stored before these fields existed.
  gaps?: {
    requirement: string
    type: 'NOT_IN_PROFILE' | 'WEAK_EVIDENCE' | 'EXPERIENCE' | 'LANGUAGE' | 'OTHER'
    importance: 'MUST_HAVE' | 'NICE_TO_HAVE'
    action: string
  }[]
  tailoringRecommended?: boolean
  tailoringReason?: string
}

export function asDeepAnalysis(analysis: Vacancy['analysis']): DeepAnalysisView | null {
  if (!analysis || typeof analysis.verdict !== 'string') return null
  return analysis as unknown as DeepAnalysisView
}

export function asTriageOnlyReason(analysis: Vacancy['analysis']): string | null {
  if (!analysis || analysis.stage !== 'triage_only') return null
  return typeof analysis.reason === 'string' ? analysis.reason : null
}
