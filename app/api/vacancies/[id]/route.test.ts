import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getVacancyById = vi.fn()

vi.mock('@/backend/db', () => ({ getVacancyById }))

const { GET } = await import('./route')

const request = new NextRequest('http://localhost/api/vacancies/v1')

describe('GET /api/vacancies/:id', () => {
  beforeEach(() => {
    getVacancyById.mockReset()
  })

  it('returns the full vacancy', async () => {
    getVacancyById.mockResolvedValue({ id: 'v1', description: 'Full posting text' })
    const res = await GET(request, { params: { id: 'v1' } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 'v1', description: 'Full posting text' })
    expect(getVacancyById).toHaveBeenCalledWith('v1')
  })

  it('returns 404 for an unknown id', async () => {
    getVacancyById.mockResolvedValue(null)
    const res = await GET(request, { params: { id: 'nope' } })
    expect(res.status).toBe(404)
  })
})
