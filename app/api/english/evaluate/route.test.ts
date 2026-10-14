import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const createEnglishAssessment = vi.fn()
const evaluateEnglish = vi.fn()

vi.mock('@/backend/english/repository', () => ({ createEnglishAssessment }))
vi.mock('@/backend/english/llm', () => ({ evaluateEnglish }))

const { POST } = await import('./route')

const question = (id: string, level: string, answerIndex: number) => ({
  id,
  level,
  skill: 'GRAMMAR',
  passage: '',
  prompt: '?',
  options: ['a', 'b', 'c', 'd'],
  answerIndex,
  explanation: '',
})
const test = {
  questions: [question('q1', 'A2', 0), question('q2', 'B2', 1)],
  writingTasks: [{ id: 'w1', prompt: 'Write an email', minWords: 80, maxWords: 150 }],
}
const conversation = [
  { role: 'assistant', content: 'Hi, tell me about yourself.' },
  { role: 'user', content: 'I am a junior developer.' },
]
const result = { overall: 'B1' }

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/english/evaluate', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/english/evaluate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createEnglishAssessment.mockImplementation(async (r, score) => ({ id: 'a1', overallLevel: r.overall, result: r, quizScore: score }))
  })

  it('scores the quiz in code, passes it to the evaluator, and saves the result', async () => {
    evaluateEnglish.mockResolvedValue({ ok: true, result, usage: {} })
    const res = await POST(makeRequest({ test, answers: [0, 3], writing: ['Dear recruiter…'], conversation }))

    expect(res.status).toBe(200)
    const args = evaluateEnglish.mock.calls[0][0]
    expect(args.score).toMatchObject({ correct: 1, total: 2 })
    expect(args.writing).toEqual([{ task: test.writingTasks[0], text: 'Dear recruiter…' }])
    expect(createEnglishAssessment).toHaveBeenCalledWith(result, args.score)
  })

  it('rejects answers that do not line up with the test', async () => {
    const res = await POST(makeRequest({ test, answers: [0], writing: ['x'], conversation }))
    expect(res.status).toBe(400)
    expect(evaluateEnglish).not.toHaveBeenCalled()
  })

  it('rejects a malformed test', async () => {
    const res = await POST(makeRequest({ test: { questions: [] }, answers: [], writing: [], conversation }))
    expect(res.status).toBe(400)
  })

  it('returns 502 and saves nothing when the evaluation fails', async () => {
    evaluateEnglish.mockResolvedValue({ ok: false, error: 'cut off', usage: {} })
    const res = await POST(makeRequest({ test, answers: [0, 1], writing: ['x'], conversation }))
    expect(res.status).toBe(502)
    expect(createEnglishAssessment).not.toHaveBeenCalled()
  })
})
