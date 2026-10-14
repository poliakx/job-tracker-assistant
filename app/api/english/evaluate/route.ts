import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createEnglishAssessment } from '@/backend/english/repository'
import { EnglishTestSchema, scoreQuiz } from '@/backend/english/assessment'
import { evaluateEnglish } from '@/backend/english/llm'

export const dynamic = 'force-dynamic'

const EvaluateRequestSchema = z.object({
  test: EnglishTestSchema,
  // One entry per question: the chosen option index, or null if skipped.
  answers: z.array(z.number().int().nullable()),
  // One entry per writing task, same order.
  writing: z.array(z.string().max(5000)),
  conversation: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(5000) })),
})

// POST { test, answers, writing, conversation } — score the quiz in code,
// have the LLM assess everything into CEFR levels, and save the result.
export async function POST(req: NextRequest) {
  try {
    const parsed = EvaluateRequestSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid request', details: parsed.error.issues[0]?.message }, { status: 400 })
    }
    const { test, answers, writing, conversation } = parsed.data
    if (answers.length !== test.questions.length || writing.length !== test.writingTasks.length) {
      return NextResponse.json({ error: 'answers/writing do not match the test' }, { status: 400 })
    }

    const score = scoreQuiz(test, answers)
    const outcome = await evaluateEnglish({
      test,
      score,
      writing: test.writingTasks.map((task, i) => ({ task, text: writing[i] })),
      conversation,
    })
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 502 })

    const saved = await createEnglishAssessment(outcome.result, score)
    return NextResponse.json(saved)
  } catch (e) {
    return NextResponse.json({ error: 'failed to evaluate' }, { status: 500 })
  }
}
