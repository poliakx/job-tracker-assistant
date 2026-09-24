import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const interviewStep = vi.fn()

vi.mock('@/backend/llm/interview', () => ({ interviewStep }))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/profile/interview', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/profile/interview', () => {
  beforeEach(() => {
    interviewStep.mockReset()
  })

  it('starts with an empty history when none is given', async () => {
    interviewStep.mockResolvedValue({ ok: true, result: { message: 'Hi! What roles are you targeting?', done: false }, usage: {} })
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(200)
    expect(interviewStep).toHaveBeenCalledWith([])
    const body = await res.json()
    expect(body.done).toBe(false)
  })

  it('passes through the given message history', async () => {
    interviewStep.mockResolvedValue({ ok: true, result: { message: 'Got it.', done: true }, usage: {} })
    const history = [{ role: 'user', content: 'I use Node.js.' }]
    await POST(makeRequest({ messages: history }))
    expect(interviewStep).toHaveBeenCalledWith(history)
  })

  it('returns 502 when the model call fails', async () => {
    interviewStep.mockResolvedValue({ ok: false, error: 'schema validation failed', usage: {} })
    const res = await POST(makeRequest({ messages: [] }))
    expect(res.status).toBe(502)
  })
})
