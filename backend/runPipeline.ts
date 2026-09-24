// One full pipeline run (ingest → filter → analyze) recorded as a
// PipelineRun. Shared by the scheduled cron endpoint and the dashboard's
// "Search" buttons, so both behave identically. Kept apart from pipeline.ts
// so tests can mock the individual stages.
import type { Prisma } from '@prisma/client'
import { createPipelineRun, finishPipelineRun } from './db'
import { runAnalyze, runFilter, runIngest, type PipelineError } from './pipeline'
import type { VacancySource } from './sources/types'

// Deep analysis is the slow, paid step (an LLM call per vacancy); keep one
// invocation small enough to finish inside a serverless function's time
// limit. Anything left over is picked up on the next run — see
// getVacanciesPendingAnalysis, which always resumes where the last run
// stopped.
const ANALYZE_BATCH_LIMIT = 5
const FILTER_BATCH_LIMIT = 200

export interface PipelineRunSummary {
  runId: string
  fetched: number
  newCount: number
  analyzed: number
  errors: number
}

export class PipelineRunError extends Error {
  constructor(public runId: string, message: string) {
    super(message)
  }
}

export async function runPipeline(sourcesToRun: VacancySource[]): Promise<PipelineRunSummary> {
  const run = await createPipelineRun(sourcesToRun.map(s => s.name).join(','))

  try {
    // One broken source (site down, markup changed) must not block the
    // others — record it and keep going.
    const ingestErrors: PipelineError[] = []
    let fetched = 0
    let newCount = 0
    for (const source of sourcesToRun) {
      try {
        const result = await runIngest(source)
        fetched += result.fetched
        newCount += result.newCount
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        ingestErrors.push({ vacancyId: '', stage: 'ingest', message: `${source.name}: ${message}` })
      }
    }

    await runFilter(FILTER_BATCH_LIMIT)
    const { analyzed, errors: analyzeErrors, usage } = await runAnalyze(ANALYZE_BATCH_LIMIT)
    const errors = [...ingestErrors, ...analyzeErrors]

    await finishPipelineRun(run.id, {
      fetched,
      newCount,
      analyzed,
      errors: errors as unknown as Prisma.InputJsonValue,
      tokenUsage: usage as unknown as Prisma.InputJsonValue,
    })
    return { runId: run.id, fetched, newCount, analyzed, errors: errors.length }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await finishPipelineRun(run.id, {
      fetched: 0,
      newCount: 0,
      analyzed: 0,
      errors: [{ vacancyId: '', stage: 'fatal', message }] as unknown as Prisma.InputJsonValue,
    })
    throw new PipelineRunError(run.id, message)
  }
}
