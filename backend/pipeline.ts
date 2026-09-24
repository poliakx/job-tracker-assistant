// Shared orchestration for the ingest → filter → analyze pipeline. Used by
// both the manual scripts (scripts/ingest-once.ts, scripts/analyze-once.ts)
// and the scheduled endpoint (app/api/cron/ingest/route.ts) — one place so
// a bug fix or a prompt change applies everywhere, not just wherever it was
// first written.
import type { VacancySource } from './sources/types'
import { upsertVacancies } from './ingest/upsert'
import {
  claimVacancyAnalysis,
  countAnalyzedSince,
  getActiveProfile,
  getVacanciesPendingAnalysis,
  getVacanciesPendingFilter,
  updateVacancy,
} from './db'
import { filterVacancy } from './filter'
import { analyzeVacancyDeep, triageVacancy, type DeepAnalysisResult } from './llm/analyze'

export type PipelineStage = 'ingest' | 'triage' | 'deep'

export interface PipelineError {
  vacancyId: string
  stage: PipelineStage
  message: string
}

export interface TokenUsageTotals {
  triageInputTokens: number
  triageOutputTokens: number
  deepInputTokens: number
  deepOutputTokens: number
}

function emptyUsage(): TokenUsageTotals {
  return { triageInputTokens: 0, triageOutputTokens: 0, deepInputTokens: 0, deepOutputTokens: 0 }
}

export async function runIngest(source: VacancySource): Promise<{ fetched: number; newCount: number }> {
  const raw = await source.fetchRecent()
  const inserted = await upsertVacancies(raw)
  return { fetched: raw.length, newCount: inserted.length }
}

export interface FilterBatchResult {
  dismissed: number
  flagged: number
  clean: number
}

export async function runFilter(limit?: number): Promise<FilterBatchResult> {
  const profile = await getActiveProfile()
  const pending = await getVacanciesPendingFilter(limit)
  const result: FilterBatchResult = { dismissed: 0, flagged: 0, clean: 0 }
  for (const vacancy of pending) {
    const outcome = filterVacancy(vacancy, profile)
    await updateVacancy(vacancy.id, {
      filterReasons: outcome.reasons,
      ...(outcome.pass ? {} : { status: 'DISMISSED' }),
    })
    if (!outcome.pass) result.dismissed++
    else if (outcome.reasons.length > 0) result.flagged++
    else result.clean++
  }
  return result
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export interface AnalyzeBatchResult {
  analyzed: number
  errors: PipelineError[]
  usage: TokenUsageTotals
}

// Fired once per vacancy after it's been processed, so a caller (the
// manual script) can print a human-readable summary without this module
// duplicating that presentation logic, and without the caller duplicating
// the analysis logic.
export interface AnalyzeVacancyOutcome {
  vacancy: { id: string; title: string; company: string }
  triageError?: string
  triageResult?: { worthDeepAnalysis: boolean; reason: string }
  deepError?: string
  deepResult?: DeepAnalysisResult
}

export async function runAnalyze(batchSize: number, onResult?: (outcome: AnalyzeVacancyOutcome) => void): Promise<AnalyzeBatchResult> {
  const usage = emptyUsage()
  const errors: PipelineError[] = []
  let analyzed = 0

  const dailyCap = Number(process.env.ANALYSIS_DAILY_CAP ?? 50)
  const analyzedToday = await countAnalyzedSince(startOfToday())
  const limit = Math.max(0, Math.min(batchSize, dailyCap - analyzedToday))
  if (limit <= 0) return { analyzed, errors, usage }

  const profile = await getActiveProfile()
  const pending = await getVacanciesPendingAnalysis(limit)
  for (const vacancy of pending) {
    const vacancyInfo = { id: vacancy.id, title: vacancy.title, company: vacancy.company }
    const triage = await triageVacancy(vacancy, profile)
    usage.triageInputTokens += triage.usage.inputTokens
    usage.triageOutputTokens += triage.usage.outputTokens

    if (!triage.ok) {
      errors.push({ vacancyId: vacancy.id, stage: 'triage', message: triage.error })
      onResult?.({ vacancy: vacancyInfo, triageError: triage.error })
      continue
    }
    if (!triage.result.worthDeepAnalysis) {
      // Record the decision (fitScore stays null) so this vacancy isn't
      // re-triaged on every future run — see getVacanciesPendingAnalysis.
      // Also move it to DISMISSED: the triage prompt is explicitly biased
      // lenient ("prefer worthDeepAnalysis: true" — see
      // backend/prompts/analyze.ts), so a "no" here is a real signal, not a
      // coin flip. Leaving status at NEW forever would otherwise clutter
      // the Inbox's New tab with vacancies already known not to fit — the
      // reason stays visible on the Dismissed tab (see VacancyCard).
      await claimVacancyAnalysis(vacancy.id, {
        status: 'DISMISSED',
        analysis: { stage: 'triage_only', worthDeepAnalysis: false, reason: triage.result.reason },
      })
      onResult?.({ vacancy: vacancyInfo, triageResult: triage.result })
      continue
    }

    const deep = await analyzeVacancyDeep(vacancy, profile)
    usage.deepInputTokens += deep.usage.inputTokens
    usage.deepOutputTokens += deep.usage.outputTokens

    if (!deep.ok) {
      errors.push({ vacancyId: vacancy.id, stage: 'deep', message: deep.error })
      onResult?.({ vacancy: vacancyInfo, triageResult: triage.result, deepError: deep.error })
      continue
    }

    const claimed = await claimVacancyAnalysis(vacancy.id, {
      fitScore: deep.result.fitScore,
      suggestedResume: deep.result.suggestedResume,
      analysis: deep.result,
    })
    // If claimed is false, an overlapping run already recorded a result for
    // this vacancy between our read and our write — not an error, just
    // wasted (unavoidable) tokens on this side; don't double-count it.
    if (claimed) analyzed++
    onResult?.({ vacancy: vacancyInfo, triageResult: triage.result, deepResult: deep.result })
  }

  return { analyzed, errors, usage }
}
