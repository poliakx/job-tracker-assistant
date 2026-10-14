import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const extractProfile = vi.fn()
const getSavedProfile = vi.fn()

vi.mock('@/backend/profile/interview/interview', () => ({ extractProfile }))
vi.mock('@/backend/profile/repository', () => ({ getSavedProfile }))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/profile/interview/extract', { method: 'POST', body: JSON.stringify(body) })
}

const transcript = [{ role: 'user', content: 'I know Node.js.' }]
const contact = { fullName: 'Jan Kowalski', email: 'jan@example.com', phone: '', linkedin: '', github: '', portfolio: '' }

describe('POST /api/profile/interview/extract', () => {
  beforeEach(() => {
    extractProfile.mockReset()
    getSavedProfile.mockReset()
    getSavedProfile.mockResolvedValue(null)
  })

  it('rejects an empty transcript with 400', async () => {
    const res = await POST(makeRequest({ messages: [] }))
    expect(res.status).toBe(400)
    expect(extractProfile).not.toHaveBeenCalled()
  })

  it('returns the extracted profile on success', async () => {
    const profile = { level: 'Junior', location: { city: 'Warsaw', country: 'Poland', openToRemote: true } }
    extractProfile.mockResolvedValue({ ok: true, result: profile, usage: {} })
    const res = await POST(makeRequest({ messages: transcript }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(profile)
    expect(extractProfile).toHaveBeenCalledWith(transcript, undefined)
  })

  it('keeps the saved contact details when a new interview replaces the profile', async () => {
    getSavedProfile.mockResolvedValue({ level: 'Old', contact })
    extractProfile.mockResolvedValue({ ok: true, result: { level: 'New', contact: { ...contact, fullName: '' } }, usage: {} })
    const res = await POST(makeRequest({ messages: transcript }))
    expect(await res.json()).toEqual({ level: 'New', contact })
    // A new interview doesn't merge into the old profile.
    expect(extractProfile).toHaveBeenCalledWith(transcript, undefined)
  })

  it('merges into the saved profile in update mode', async () => {
    const saved = { level: 'Old', contact }
    getSavedProfile.mockResolvedValue(saved)
    extractProfile.mockResolvedValue({ ok: true, result: { level: 'Updated', contact }, usage: {} })
    await POST(makeRequest({ messages: transcript, mode: 'update' }))
    expect(extractProfile).toHaveBeenCalledWith(transcript, saved)
  })

  it('returns 502 when extraction fails', async () => {
    extractProfile.mockResolvedValue({ ok: false, error: 'invalid', usage: {} })
    const res = await POST(makeRequest({ messages: [{ role: 'user', content: 'hi' }] }))
    expect(res.status).toBe(502)
  })
})
