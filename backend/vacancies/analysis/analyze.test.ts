import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.ANTHROPIC_API_KEY = 'test-key'

const createMock = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: createMock }
  },
}))

const { triageVacancy, analyzeVacancyDeep } = await import('./analyze')
const { candidateProfile } = await import('@/backend/profile/seed')

const vacancy = {
  title: 'Junior Backend Developer',
  company: 'Acme',
  description: 'Node.js, PostgreSQL, Docker. 2 years of experience.',
}

function messageResponse(toolName: string, input: unknown, overrides: Partial<{ stop_reason: string }> = {}) {
  return {
    content: [{ type: 'tool_use', name: toolName, input }],
    usage: { input_tokens: 100, output_tokens: 50 },
    stop_reason: 'tool_use',
    ...overrides,
  }
}

describe('triageVacancy', () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  it('returns the parsed result on a valid response', async () => {
    createMock.mockResolvedValueOnce(messageResponse('submit_triage', { worthDeepAnalysis: true, reason: 'Good stack match.' }))

    const outcome = await triageVacancy(vacancy, candidateProfile)

    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.result).toEqual({ worthDeepAnalysis: true, reason: 'Good stack match.' })
      expect(outcome.usage).toEqual({ inputTokens: 100, outputTokens: 50 })
    }
    expect(createMock).toHaveBeenCalledTimes(1)
  })

  it('retries once on invalid input and succeeds on the second attempt', async () => {
    createMock
      .mockResolvedValueOnce(messageResponse('submit_triage', { worthDeepAnalysis: 'yes' })) // wrong type, missing reason
      .mockResolvedValueOnce(messageResponse('submit_triage', { worthDeepAnalysis: false, reason: 'No stack overlap.' }))

    const outcome = await triageVacancy(vacancy, candidateProfile)

    expect(outcome.ok).toBe(true)
    expect(createMock).toHaveBeenCalledTimes(2)
    // usage accumulates across both attempts
    if (outcome.ok) expect(outcome.usage).toEqual({ inputTokens: 200, outputTokens: 100 })
  })

  it('gives up after two failed attempts and reports the error instead of throwing', async () => {
    createMock.mockResolvedValue(messageResponse('submit_triage', { worthDeepAnalysis: 'yes' }))

    const outcome = await triageVacancy(vacancy, candidateProfile)

    expect(outcome.ok).toBe(false)
    expect(createMock).toHaveBeenCalledTimes(2)
    if (!outcome.ok) expect(outcome.error).toContain('validation failed')
  })

  it('reports an error when the model responds without the expected tool_use block', async () => {
    createMock.mockResolvedValue({
      content: [{ type: 'text', text: 'Sorry, I cannot help with that.' }],
      usage: { input_tokens: 10, output_tokens: 5 },
      stop_reason: 'end_turn',
    })

    const outcome = await triageVacancy(vacancy, candidateProfile)

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toContain('end_turn')
  })
})

describe('analyzeVacancyDeep', () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  const validDeepResult = {
    fitScore: 72,
    verdict: 'MAYBE',
    summary: 'A decent match, but TypeScript is missing.',
    matchedSkills: ['Node.js', 'PostgreSQL'],
    missingSkills: ['TypeScript'],
    redFlags: [],
    seniorityAssessment: 'JUNIOR',
    languageRequirements: ['English'],
    suggestedResume: 'BACKEND',
    suggestedResumeReason: 'Backend-heavy vacancy.',
    applyAdvice: 'Emphasize the portfolio project.',
  }

  it('returns the parsed deep analysis on a valid response', async () => {
    createMock.mockResolvedValueOnce(messageResponse('submit_analysis', validDeepResult))

    const outcome = await analyzeVacancyDeep(vacancy, candidateProfile)

    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.result.verdict).toBe('MAYBE')
  })

  it('rejects a fitScore outside 0-100 and reports the validation error', async () => {
    createMock.mockResolvedValue(messageResponse('submit_analysis', { ...validDeepResult, fitScore: 150 }))

    const outcome = await analyzeVacancyDeep(vacancy, candidateProfile)

    expect(outcome.ok).toBe(false)
    expect(createMock).toHaveBeenCalledTimes(2) // one retry, still invalid
  })

  it('rejects an invalid verdict enum value', async () => {
    createMock.mockResolvedValue(messageResponse('submit_analysis', { ...validDeepResult, verdict: 'GREAT' }))

    const outcome = await analyzeVacancyDeep(vacancy, candidateProfile)

    expect(outcome.ok).toBe(false)
  })
})
