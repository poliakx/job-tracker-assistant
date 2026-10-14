// Database access for English test results.
import { Prisma } from '@prisma/client'
import prisma from '@/backend/shared/db/prisma'
import { EnglishAssessmentResultSchema } from './assessment'
import type { EnglishAssessmentResult, QuizScore } from '@/types'

export async function getLatestEnglishAssessment() {
  return await prisma.englishAssessment.findFirst({ orderBy: { createdAt: 'desc' } })
}

// The latest assessment's result, validated — for prompts that need it.
// null if there's no assessment yet (or it's somehow malformed).
export async function getLatestEnglishResult(): Promise<EnglishAssessmentResult | null> {
  const row = await getLatestEnglishAssessment()
  if (!row) return null
  const parsed = EnglishAssessmentResultSchema.safeParse(row.result)
  return parsed.success ? parsed.data : null
}

export async function getEnglishAssessments(limit = 10) {
  return await prisma.englishAssessment.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
}

export async function createEnglishAssessment(result: EnglishAssessmentResult, quizScore: QuizScore) {
  return await prisma.englishAssessment.create({
    data: {
      overallLevel: result.overall,
      result: result as unknown as Prisma.InputJsonValue,
      quizScore: quizScore as unknown as Prisma.InputJsonValue,
    },
  })
}
