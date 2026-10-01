// English assessment: zod schemas for the LLM-generated test and the
// evaluation, plus the pure quiz scoring. No LLM calls here — those live in
// backend/llm/english.ts — so backend/db can validate stored results
// without importing the Anthropic SDK.
import { z } from 'zod'
import type { CefrLevel, EnglishTest, QuizScore, QuizSkill } from '@/types'

export const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const Cefr = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])

export const QuizQuestionSchema = z
  .object({
    id: z.string(),
    level: Cefr,
    skill: z.enum(['GRAMMAR', 'VOCABULARY', 'READING']),
    passage: z.string(),
    prompt: z.string(),
    options: z.array(z.string()).min(2),
    answerIndex: z.number().int().min(0),
    explanation: z.string(),
  })
  .refine(q => q.answerIndex < q.options.length, { message: 'answerIndex out of range' })

export const WritingTaskSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  minWords: z.number().int().min(1),
  maxWords: z.number().int().min(1),
})

export const EnglishTestSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(1),
  writingTasks: z.array(WritingTaskSchema).min(1),
})

export const EnglishAssessmentResultSchema = z.object({
  overall: Cefr,
  skills: z.object({
    grammar: Cefr,
    vocabulary: Cefr,
    reading: Cefr,
    writing: Cefr,
    interaction: Cefr,
  }),
  summary: z.string(),
  strengths: z.array(z.string()),
  mistakes: z.array(z.object({ original: z.string(), correction: z.string(), explanation: z.string() })),
  recommendations: z.array(z.string()),
})

// Scored in code, not by the LLM: counting right answers is exactly the kind
// of thing a model can get subtly wrong, and it's free to do here.
// `answers[i]` is the chosen option index for questions[i], or null if skipped.
export function scoreQuiz(test: Pick<EnglishTest, 'questions'>, answers: (number | null)[]): QuizScore {
  const score: QuizScore = { correct: 0, total: test.questions.length, byLevel: {}, bySkill: {} }
  test.questions.forEach((q, i) => {
    const right = answers[i] === q.answerIndex ? 1 : 0
    score.correct += right
    const level = (score.byLevel[q.level] ??= { correct: 0, total: 0 })
    level.correct += right
    level.total += 1
    const skill = (score.bySkill[q.skill as QuizSkill] ??= { correct: 0, total: 0 })
    skill.correct += right
    skill.total += 1
  })
  return score
}

// A one-line, model-readable version of the score, e.g.
// "11/16 correct — A2 4/4, B1 4/4, B2 2/4, C1 1/4".
export function describeQuizScore(score: QuizScore): string {
  const levels = CEFR_LEVELS.filter(l => score.byLevel[l]).map(l => `${l} ${score.byLevel[l]!.correct}/${score.byLevel[l]!.total}`)
  return `${score.correct}/${score.total} correct — ${levels.join(', ')}`
}
