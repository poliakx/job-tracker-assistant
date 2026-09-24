import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getActiveProfile = vi.fn()
const saveProfile = vi.fn()

vi.mock('@/backend/db', () => ({ getActiveProfile, saveProfile }))

const { GET, PUT } = await import('./route')

const validProfile = {
  level: 'Junior backend developer',
  location: { city: 'Warsaw', country: 'Poland', openToRemote: true },
  languages: ['English'],
  stack: { backend: ['Node.js'], frontend: [], alsoKnows: [] },
  experience: '2 years project experience.',
  targetRoles: ['BACKEND'],
  resumeVersions: { FULLSTACK: '', BACKEND: 'Node.js', FRONTEND: '' },
  filterPolicy: { hardRejectTitleKeywords: ['senior'], flagIfRequiredYearsAbove: 2, conflictingStackKeywords: ['Java'] },
}

function putRequest(body: unknown) {
  return new NextRequest('http://localhost/api/profile', { method: 'PUT', body: JSON.stringify(body) })
}

describe('GET /api/profile', () => {
  it('returns the active profile', async () => {
    getActiveProfile.mockResolvedValue(validProfile)
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(validProfile)
  })
})

describe('PUT /api/profile', () => {
  beforeEach(() => {
    saveProfile.mockReset()
  })

  it('saves a valid profile', async () => {
    saveProfile.mockResolvedValue({})
    const res = await PUT(putRequest(validProfile))
    expect(res.status).toBe(200)
    expect(saveProfile).toHaveBeenCalledWith(validProfile)
  })

  it('rejects an invalid profile with 400', async () => {
    const res = await PUT(putRequest({ level: 'incomplete' }))
    expect(res.status).toBe(400)
    expect(saveProfile).not.toHaveBeenCalled()
  })
})
