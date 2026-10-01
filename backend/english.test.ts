import { describe, expect, it } from 'vitest'
import { EnglishTestSchema, describeQuizScore, scoreQuiz } from './english'
import type { QuizQuestion } from '@/types'

function q(id: string, level: QuizQuestion['level'], skill: QuizQuestion['skill'], answerIndex: number): QuizQuestion {
  return { id, level, skill, passage: '', prompt: '?', options: ['a', 'b', 'c', 'd'], answerIndex, explanation: '' }
}

const questions = [q('1', 'A2', 'GRAMMAR', 0), q('2', 'A2', 'VOCABULARY', 1), q('3', 'B2', 'GRAMMAR', 2), q('4', 'C1', 'READING', 3)]

describe('scoreQuiz', () => {
  it('counts correct answers overall, by level and by skill', () => {
    const score = scoreQuiz({ questions }, [0, 1, 0, 3])
    expect(score.correct).toBe(3)
    expect(score.total).toBe(4)
    expect(score.byLevel).toEqual({ A2: { correct: 2, total: 2 }, B2: { correct: 0, total: 1 }, C1: { correct: 1, total: 1 } })
    expect(score.bySkill).toEqual({
      GRAMMAR: { correct: 1, total: 2 },
      VOCABULARY: { correct: 1, total: 1 },
      READING: { correct: 1, total: 1 },
    })
  })

  it('treats a skipped question as wrong', () => {
    const score = scoreQuiz({ questions }, [null, null, null, null])
    expect(score.correct).toBe(0)
    expect(score.total).toBe(4)
  })

  it('describes the score in CEFR order', () => {
    expect(describeQuizScore(scoreQuiz({ questions }, [0, 1, 0, 3]))).toBe('3/4 correct — A2 2/2, B2 0/1, C1 1/1')
  })
})

describe('EnglishTestSchema', () => {
  it('rejects a question whose answer key points past its options', () => {
    const test = { questions: [{ ...q('1', 'B1', 'GRAMMAR', 0), answerIndex: 4 }], writingTasks: [{ id: 'w1', prompt: 'x', minWords: 50, maxWords: 100 }] }
    expect(EnglishTestSchema.safeParse(test).success).toBe(false)
  })

  it('accepts a well-formed test', () => {
    const test = { questions, writingTasks: [{ id: 'w1', prompt: 'x', minWords: 50, maxWords: 100 }] }
    expect(EnglishTestSchema.safeParse(test).success).toBe(true)
  })
})
