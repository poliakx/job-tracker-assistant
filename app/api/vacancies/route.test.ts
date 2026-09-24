import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getVacancies = vi.fn()
const updateVacancy = vi.fn()

vi.mock('@/backend/db', () => ({ getVacancies, updateVacancy }))

const { GET, PATCH } = await import('./route')

function getRequest(query = '') {
  return new NextRequest(`http://localhost/api/vacancies${query}`)
}

function patchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/vacancies', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

describe('GET /api/vacancies', () => {
  beforeEach(() => {
    getVacancies.mockReset()
  })

  it('returns the list with no filters', async () => {
    getVacancies.mockResolvedValue([{ id: 'v1' }])
    const res = await GET(getRequest())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ id: 'v1' }])
    expect(getVacancies).toHaveBeenCalledWith({ status: undefined, minScore: undefined })
  })

  it('passes status and minScore through to getVacancies', async () => {
    getVacancies.mockResolvedValue([])
    await GET(getRequest('?status=SHORTLISTED&minScore=50'))
    expect(getVacancies).toHaveBeenCalledWith({ status: 'SHORTLISTED', minScore: 50 })
  })

  it('rejects an invalid status with 400', async () => {
    const res = await GET(getRequest('?status=BOGUS'))
    expect(res.status).toBe(400)
    expect(getVacancies).not.toHaveBeenCalled()
  })

  it('rejects a non-numeric minScore with 400', async () => {
    const res = await GET(getRequest('?minScore=abc'))
    expect(res.status).toBe(400)
    expect(getVacancies).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/vacancies', () => {
  beforeEach(() => {
    updateVacancy.mockReset()
  })

  it('requires an id', async () => {
    const res = await PATCH(patchRequest({ status: 'SHORTLISTED' }))
    expect(res.status).toBe(400)
    expect(updateVacancy).not.toHaveBeenCalled()
  })

  it('updates the vacancy status', async () => {
    updateVacancy.mockResolvedValue({ id: 'v1', status: 'SHORTLISTED' })
    const res = await PATCH(patchRequest({ id: 'v1', status: 'SHORTLISTED' }))
    expect(res.status).toBe(200)
    expect(updateVacancy).toHaveBeenCalledWith('v1', { status: 'SHORTLISTED' })
  })
})
