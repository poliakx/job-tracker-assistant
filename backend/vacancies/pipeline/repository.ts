// Database access for pipeline runs: one execution of the ingest → filter →
// analyze pipeline, recorded for observability and the daily cost cap.
import { Prisma } from '@prisma/client'
import prisma from '@/backend/shared/db/prisma'
import type { PipelineRun } from '@/types'

// For the daily analysis cost cap: how many vacancies pipeline runs started
// since `date` have deep-analyzed. Counted from PipelineRun rows rather than
// Vacancy.updatedAt, which every status change (shortlist, dismiss) bumps.
export async function countAnalyzedSince(date: Date) {
  const result = await prisma.pipelineRun.aggregate({ _sum: { analyzed: true }, where: { startedAt: { gte: date } } })
  return result._sum.analyzed ?? 0
}

export async function createPipelineRun(source: string) {
  return await prisma.pipelineRun.create({ data: { source } })
}

export async function finishPipelineRun(
  id: string,
  data: Pick<PipelineRun, 'fetched' | 'newCount' | 'analyzed'> & {
    errors?: Prisma.InputJsonValue
    tokenUsage?: Prisma.InputJsonValue
  }
) {
  return await prisma.pipelineRun.update({
    where: { id },
    data: {
      finishedAt: new Date(),
      fetched: data.fetched,
      newCount: data.newCount,
      analyzed: data.analyzed,
      ...(data.errors !== undefined ? { errors: data.errors } : {}),
      ...(data.tokenUsage !== undefined ? { tokenUsage: data.tokenUsage } : {}),
    },
  })
}

export async function getLatestPipelineRun() {
  return await prisma.pipelineRun.findFirst({ orderBy: { startedAt: 'desc' } })
}
