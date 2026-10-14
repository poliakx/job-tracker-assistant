import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const interviewStep = vi.fn()
const getSavedProfile = vi.fn()
const getLatestEnglishResult = vi.fn()

vi.mock('@/backend/profile/interview/interview', () => ({ interviewStep }))
vi.mock('@/backend/profile/repository', () => ({ getSavedProfile }))
vi.mock('@/backend/english/repository', () => ({ getLatestEnglishResult }))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/profile/interview', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/profile/interview', () => {
  beforeEach(() => {
    interviewStep.mockReset()
    getSavedProfile.mockReset()
    getLatestEnglishResult.mockReset()
    getLatestEnglishResult.mockResolvedValue(null)
  })

  it('starts with an empty history when none is given', async () => {
    interviewStep.mockResolvedValue({ ok: true, result: { message: 'Hi! What roles are you targeting?', done: false }, usage: {} })
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(200)
    expect(interviewStep).toHaveBeenCalledWith([], undefined)
    const body = await res.json()
    expect(body.done).toBe(false)
  })

  it('passes through the given message history', async () => {
    interviewStep.mockResolvedValue({ ok: true, result: { message: 'Got it.', done: true }, usage: {} })
    const history = [{ role: 'user', content: 'I use Node.js.' }]
    await POST(makeRequest({ messages: history }))
    expect(interviewStep).toHaveBeenCalledWith(history, undefined)
  })

  it('runs a follow-up interview against the saved profile in update mode', async () => {
    const saved = { level: 'Junior' }
    getSavedProfile.mockResolvedValue(saved)
    interviewStep.mockResolvedValue({ ok: true, result: { message: 'What changed?', done: false }, usage: {} })
    await POST(makeRequest({ messages: [], mode: 'update' }))
    expect(interviewStep).toHaveBeenCalledWith([], saved, null)
  })

  it('gives a follow-up interview the latest English test result', async () => {
    const saved = { level: 'Junior' }
    const english = { overall: 'A2' }
    getSavedProfile.mockResolvedValue(saved)
    getLatestEnglishResult.mockResolvedValue(english)
    interviewStep.mockResolvedValue({ ok: true, result: { message: 'What changed?', done: false }, usage: {} })
    await POST(makeRequest({ messages: [], mode: 'update' }))
    expect(interviewStep).toHaveBeenCalledWith([], saved, english)
  })

  it('falls back to a fresh interview in update mode when nothing is saved', async () => {
    getSavedProfile.mockResolvedValue(null)
    interviewStep.mockResolvedValue({ ok: true, result: { message: 'Hi!', done: false }, usage: {} })
    await POST(makeRequest({ messages: [], mode: 'update' }))
    expect(interviewStep).toHaveBeenCalledWith([], undefined)
  })

  it('does not load the saved profile for a new interview', async () => {
    interviewStep.mockResolvedValue({ ok: true, result: { message: 'Hi!', done: false }, usage: {} })
    await POST(makeRequest({ messages: [] }))
    expect(getSavedProfile).not.toHaveBeenCalled()
  })

  it('returns 502 when the model call fails', async () => {
    interviewStep.mockResolvedValue({ ok: false, error: 'schema validation failed', usage: {} })
    const res = await POST(makeRequest({ messages: [] }))
    expect(res.status).toBe(502)
  })
})
