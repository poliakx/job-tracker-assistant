import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listRepos = vi.fn()
const getRepoDetails = vi.fn()
const extractProfile = vi.fn()
const getSavedProfile = vi.fn()

vi.mock('@/backend/profile/github', async importOriginal => ({
  ...(await importOriginal<typeof import('@/backend/profile/github')>()),
  listRepos,
  getRepoDetails,
}))
vi.mock('@/backend/profile/interview/interview', () => ({ extractProfile }))
vi.mock('@/backend/profile/repository', () => ({ getSavedProfile }))

const { GET, POST } = await import('./route')
const { GithubError } = await import('@/backend/profile/github')

const contact = { fullName: '', email: '', phone: '', linkedin: '', github: 'https://github.com/octocat', portfolio: '' }
const saved = { level: 'Junior', projects: [], contact }

function getRequest(query = '') {
  return new NextRequest(`http://localhost/api/profile/github${query}`)
}
function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/profile/github', { method: 'POST', body: JSON.stringify(body) })
}

const details = {
  name: 'tracker',
  fullName: 'octocat/tracker',
  url: 'https://github.com/octocat/tracker',
  description: 'Job tracker',
  language: 'TypeScript',
  topics: [],
  stars: 0,
  updatedAt: '2026-09-01T10:00:00Z',
  isPrivate: false,
  languages: ['TypeScript'],
  readme: '# Tracker',
}

describe('GET /api/profile/github', () => {
  beforeEach(() => {
    listRepos.mockReset()
    getSavedProfile.mockReset()
    getSavedProfile.mockResolvedValue(saved)
  })

  it('falls back to the GitHub link in the saved contact details', async () => {
    listRepos.mockResolvedValue([])
    const res = await GET(getRequest())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ user: 'octocat', repos: [] })
    expect(listRepos).toHaveBeenCalledWith('octocat')
  })

  it('uses ?user= when given', async () => {
    listRepos.mockResolvedValue([])
    await GET(getRequest('?user=github.com/someone'))
    expect(listRepos).toHaveBeenCalledWith('someone')
  })

  it('rejects a missing or invalid username', async () => {
    getSavedProfile.mockResolvedValue(null)
    expect((await GET(getRequest())).status).toBe(400)
    expect((await GET(getRequest('?user=not%20valid'))).status).toBe(400)
    expect(listRepos).not.toHaveBeenCalled()
  })

  it('passes GitHub errors through with their status', async () => {
    listRepos.mockRejectedValue(new GithubError('rate limit', 429))
    const res = await GET(getRequest())
    expect(res.status).toBe(429)
    expect((await res.json()).error).toBe('rate limit')
  })
})

describe('POST /api/profile/github', () => {
  beforeEach(() => {
    getRepoDetails.mockReset()
    extractProfile.mockReset()
    getSavedProfile.mockReset()
    getSavedProfile.mockResolvedValue(saved)
    getRepoDetails.mockResolvedValue(details)
  })

  it('merges the chosen repos into the saved profile and returns it unsaved', async () => {
    const updated = { ...saved, projects: [{ name: 'tracker' }] }
    extractProfile.mockResolvedValue({ ok: true, result: updated, usage: {} })
    const res = await POST(postRequest({ repos: ['tracker'] }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(updated)
    expect(getRepoDetails).toHaveBeenCalledWith('octocat', 'tracker')
    const [transcript, existing] = extractProfile.mock.calls[0]
    expect(existing).toBe(saved)
    expect(transcript.at(-1).content).toContain('URL: https://github.com/octocat/tracker')
  })

  it('rejects an empty or oversized selection', async () => {
    expect((await POST(postRequest({ repos: [] }))).status).toBe(400)
    const many = Array.from({ length: 11 }, (_, i) => `r${i}`)
    expect((await POST(postRequest({ repos: many }))).status).toBe(400)
    expect(getRepoDetails).not.toHaveBeenCalled()
  })

  it('needs a saved profile to merge into', async () => {
    getSavedProfile.mockResolvedValue(null)
    const res = await POST(postRequest({ user: 'octocat', repos: ['tracker'] }))
    expect(res.status).toBe(409)
  })

  it('returns 502 when extraction fails', async () => {
    extractProfile.mockResolvedValue({ ok: false, error: 'invalid', usage: {} })
    expect((await POST(postRequest({ repos: ['tracker'] }))).status).toBe(502)
  })
})
