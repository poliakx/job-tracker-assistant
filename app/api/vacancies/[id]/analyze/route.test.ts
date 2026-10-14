import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getVacancyById = vi.fn()
const getActiveProfile = vi.fn()
const getLatestEnglishResult = vi.fn()
const updateVacancy = vi.fn()
const analyzeVacancyDeep = vi.fn()

vi.mock('@/backend/vacancies/repository', () => ({ getVacancyById, updateVacancy }))
vi.mock('@/backend/profile/repository', () => ({ getActiveProfile }))
vi.mock('@/backend/english/repository', () => ({ getLatestEnglishResult }))
vi.mock('@/backend/vacancies/analysis/analyze', () => ({ analyzeVacancyDeep }))

const { POST } = await import('./route')

const request = () => new NextRequest('http://localhost/api/vacancies/v1/analyze', { method: 'POST' })
const vacancy = { id: 'v1', title: 'Junior Dev', company: 'Acme', description: 'Node.js' }
const profile = { level: 'Junior' }
const english = { overall: 'B2' }

describe('POST /api/vacancies/:id/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getActiveProfile.mockResolvedValue(profile)
    getLatestEnglishResult.mockResolvedValue(english)
    updateVacancy.mockImplementation(async (id, patch) => ({ id, ...patch }))
  })

  it('returns 404 for an unknown vacancy', async () => {
    getVacancyById.mockResolvedValue(null)
    const res = await POST(request(), { params: { id: 'nope' } })
    expect(res.status).toBe(404)
    expect(analyzeVacancyDeep).not.toHaveBeenCalled()
  })

  it('analyzes against the profile and latest English result, and stores the result', async () => {
    getVacancyById.mockResolvedValue(vacancy)
    const result = { fitScore: 72.4, suggestedResume: 'BACKEND', gaps: [], tailoringRecommended: true }
    analyzeVacancyDeep.mockResolvedValue({ ok: true, result, usage: {} })

    const res = await POST(request(), { params: { id: 'v1' } })

    expect(res.status).toBe(200)
    expect(analyzeVacancyDeep).toHaveBeenCalledWith(vacancy, profile, english)
    expect(updateVacancy).toHaveBeenCalledWith('v1', { fitScore: 72, suggestedResume: 'BACKEND', analysis: result })
  })

  it('returns 502 and stores nothing when the analysis fails', async () => {
    getVacancyById.mockResolvedValue(vacancy)
    analyzeVacancyDeep.mockResolvedValue({ ok: false, error: 'schema validation failed', usage: {} })
    const res = await POST(request(), { params: { id: 'v1' } })
    expect(res.status).toBe(502)
    expect(updateVacancy).not.toHaveBeenCalled()
  })
})
