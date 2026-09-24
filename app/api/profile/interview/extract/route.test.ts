import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const extractProfile = vi.fn()

vi.mock('@/backend/llm/interview', () => ({ extractProfile }))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/profile/interview/extract', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/profile/interview/extract', () => {
  beforeEach(() => {
    extractProfile.mockReset()
  })

  it('rejects an empty transcript with 400', async () => {
    const res = await POST(makeRequest({ messages: [] }))
    expect(res.status).toBe(400)
    expect(extractProfile).not.toHaveBeenCalled()
  })

  it('returns the extracted profile on success', async () => {
    const profile = { level: 'Junior', location: { city: 'Warsaw', country: 'Poland', openToRemote: true } }
    extractProfile.mockResolvedValue({ ok: true, result: profile, usage: {} })
    const res = await POST(makeRequest({ messages: [{ role: 'user', content: 'I know Node.js.' }] }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(profile)
  })

  it('returns 502 when extraction fails', async () => {
    extractProfile.mockResolvedValue({ ok: false, error: 'invalid', usage: {} })
    const res = await POST(makeRequest({ messages: [{ role: 'user', content: 'hi' }] }))
    expect(res.status).toBe(502)
  })
})
