import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSavedProfile = vi.fn()
const saveProfile = vi.fn()

vi.mock('@/backend/profile/repository', () => ({ getSavedProfile, saveProfile }))

const { GET, PUT } = await import('./route')

// A profile saved before the resume-grade fields existed.
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
  it('returns the saved profile', async () => {
    getSavedProfile.mockResolvedValue(validProfile)
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ profile: validProfile })
  })

  it('returns profile: null when nothing is saved yet', async () => {
    getSavedProfile.mockResolvedValue(null)
    const res = await GET()
    expect(await res.json()).toEqual({ profile: null })
  })
})

describe('PUT /api/profile', () => {
  beforeEach(() => {
    saveProfile.mockReset()
  })

  it('saves a valid profile, filling the resume fields an older profile lacks with empty defaults', async () => {
    saveProfile.mockResolvedValue({})
    const res = await PUT(putRequest(validProfile))
    expect(res.status).toBe(200)
    const saved = saveProfile.mock.calls[0][0]
    expect(saved).toMatchObject(validProfile)
    expect(saved.workExperience).toEqual([])
    expect(saved.projects).toEqual([])
    expect(saved.contact).toEqual({ fullName: '', email: '', phone: '', linkedin: '', github: '', portfolio: '' })
  })

  it('keeps resume-grade fields when they are given', async () => {
    saveProfile.mockResolvedValue({})
    const project = {
      name: 'Tracker',
      kind: 'PERSONAL',
      role: 'solo',
      description: 'Job tracker',
      achievements: [],
      tech: ['Next.js'],
      url: 'https://github.com/me/tracker-web',
      links: ['https://github.com/me/tracker-api'],
    }
    await PUT(putRequest({ ...validProfile, projects: [project] }))
    expect(saveProfile.mock.calls[0][0].projects).toEqual([project])
  })

  it('rejects a work entry without a valid kind', async () => {
    const res = await PUT(putRequest({ ...validProfile, workExperience: [{ title: 'Dev', company: 'Acme', kind: 'SIDE_GIG' }] }))
    expect(res.status).toBe(400)
    expect(saveProfile).not.toHaveBeenCalled()
  })

  it('rejects an invalid profile with 400', async () => {
    const res = await PUT(putRequest({ level: 'incomplete' }))
    expect(res.status).toBe(400)
    expect(saveProfile).not.toHaveBeenCalled()
  })
})
