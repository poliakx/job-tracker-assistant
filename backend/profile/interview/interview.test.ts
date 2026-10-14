import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.ANTHROPIC_API_KEY = 'test-key'

const createMock = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: createMock }
  },
}))

const { interviewStep, extractProfile } = await import('./interview')

function messageResponse(toolName: string, input: unknown) {
  return {
    content: [{ type: 'tool_use', name: toolName, input }],
    usage: { input_tokens: 50, output_tokens: 20 },
    stop_reason: 'tool_use',
  }
}

describe('interviewStep', () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  it('sends a synthetic starter message on the first call (empty history)', async () => {
    createMock.mockResolvedValueOnce(
      messageResponse('submit_interview_step', { message: 'What roles are you targeting?', done: false })
    )

    const outcome = await interviewStep([])

    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.result.done).toBe(false)
    const callArgs = createMock.mock.calls[0][0]
    expect(callArgs.messages).toEqual([{ role: 'user', content: "Let's start." }])
  })

  it('passes the existing conversation through unchanged', async () => {
    createMock.mockResolvedValueOnce(messageResponse('submit_interview_step', { message: 'Got it, thanks!', done: true }))

    const history = [
      { role: 'user' as const, content: 'I know Node.js and React.' },
      { role: 'assistant' as const, content: 'What backend framework do you use?' },
      { role: 'user' as const, content: 'Express.' },
    ]
    const outcome = await interviewStep(history)

    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.result.done).toBe(true)
    const callArgs = createMock.mock.calls[0][0]
    expect(callArgs.messages).toEqual(history)
  })

  it('reports a clear error without retrying when the reply is cut off at max_tokens', async () => {
    createMock.mockResolvedValue({
      ...messageResponse('submit_interview_step', { message: 'Here is a long recap of' }),
      stop_reason: 'max_tokens',
    })

    const outcome = await interviewStep([{ role: 'user', content: 'hi' }])

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toMatch(/max_tokens/)
    expect(createMock).toHaveBeenCalledTimes(1)
  })

  it('reports an error instead of throwing when the response is malformed', async () => {
    createMock.mockResolvedValue(messageResponse('submit_interview_step', { message: 'x' })) // missing done

    const outcome = await interviewStep([{ role: 'user', content: 'hi' }])

    expect(outcome.ok).toBe(false)
    expect(createMock).toHaveBeenCalledTimes(2) // one retry
  })
})

describe('extractProfile', () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  const validProfile = {
    level: 'Junior backend developer',
    location: { city: 'Warsaw', country: 'Poland', openToRemote: true },
    languages: ['English'],
    stack: { backend: ['Node.js'], frontend: ['React'], alsoKnows: [] },
    experience: '2 years self-taught (project experience only, no commercial work).',
    targetRoles: ['BACKEND'],
    resumeVersions: { FULLSTACK: '', BACKEND: 'Node.js', FRONTEND: '' },
    filterPolicy: {
      hardRejectTitleKeywords: ['senior', 'lead'],
      flagIfRequiredYearsAbove: 2,
      conflictingStackKeywords: ['Java', 'PHP'],
    },
  }

  it('returns the structured profile on a valid response', async () => {
    createMock.mockResolvedValueOnce(messageResponse('submit_profile', validProfile))

    const outcome = await extractProfile([{ role: 'user', content: 'I know Node.js and React, not Java or PHP.' }])

    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.result.stack.backend).toEqual(['Node.js'])
      expect(outcome.result.filterPolicy.conflictingStackKeywords).toEqual(['Java', 'PHP'])
    }
  })

  it('in update mode, sends the saved profile without contact details and keeps the saved contact', async () => {
    const contact = { fullName: 'Jan Kowalski', email: 'jan@example.com', phone: '+48 600', linkedin: '', github: '', portfolio: '' }
    const { candidateProfile } = await import('@/backend/profile/seed')
    const existing = { ...candidateProfile, contact }
    // Even if the model returned something for contact, the saved one wins.
    createMock.mockResolvedValueOnce(
      messageResponse('submit_profile', { ...validProfile, contact: { ...contact, email: 'wrong@example.com' } })
    )

    const outcome = await extractProfile([{ role: 'user', content: 'I started a new job.' }], existing)

    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.result.contact).toEqual(contact)
    const system: string = createMock.mock.calls[0][0].system
    expect(system).toContain('Saved profile:')
    expect(system).not.toContain('jan@example.com')
    expect(system).not.toContain('+48 600')
  })

  it('rejects a profile with an invalid targetRoles value', async () => {
    createMock.mockResolvedValue(messageResponse('submit_profile', { ...validProfile, targetRoles: ['NOT_A_REAL_ROLE'] }))

    const outcome = await extractProfile([{ role: 'user', content: 'hi' }])

    expect(outcome.ok).toBe(false)
  })
})
