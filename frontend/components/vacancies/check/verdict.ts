import type { VacancyStatus } from '@/types'
import type { DeepAnalysisView } from '@/frontend/helpers/vacancyAnalysis'

type Verdict = DeepAnalysisView['verdict']

export const VERDICT_STYLE: Record<Verdict, { label: string; chip: string; ring: string }> = {
  STRONG: { label: 'Strong match', chip: 'bg-green-50 text-green-800 ring-green-200', ring: 'text-green-600' },
  MAYBE: { label: 'Possible match', chip: 'bg-amber-50 text-amber-800 ring-amber-200', ring: 'text-amber-500' },
  WEAK: { label: 'Weak match', chip: 'bg-gray-50 text-gray-600 ring-gray-200', ring: 'text-gray-400' },
}

export const STATUS_STYLE: Record<VacancyStatus, { label: string; cls: string }> = {
  NEW: { label: 'New', cls: 'bg-gray-100 text-gray-600' },
  SHORTLISTED: { label: 'Shortlisted', cls: 'bg-blue-50 text-blue-800' },
  APPLIED: { label: 'Applied', cls: 'bg-green-50 text-green-800' },
  DISMISSED: { label: 'Dismissed', cls: 'bg-gray-100 text-gray-400' },
}
