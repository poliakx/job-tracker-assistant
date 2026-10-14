import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const promoteVacancyToApplication = vi.fn()

vi.mock('@/backend/vacancies/repository', () => ({ promoteVacancyToApplication }))

const { POST } = await import('./route')

function makeRequest() {
  return new NextRequest('http://localhost/api/vacancies/v1/promote', { method: 'POST' })
}

describe('POST /api/vacancies/:id/promote', () => {
  beforeEach(() => {
    promoteVacancyToApplication.mockReset()
  })

  it('returns 404 when the vacancy does not exist', async () => {
    promoteVacancyToApplication.mockResolvedValue({ ok: false, reason: 'not_found' })
    const res = await POST(makeRequest(), { params: { id: 'missing' } })
    expect(res.status).toBe(404)
  })

  it('creates and returns the application on first promotion', async () => {
    promoteVacancyToApplication.mockResolvedValue({
      ok: true,
      application: { id: 'app-1', company: 'Acme' },
      alreadyPromoted: false,
    })
    const res = await POST(makeRequest(), { params: { id: 'v1' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alreadyPromoted).toBe(false)
    expect(body.application.id).toBe('app-1')
  })

  it('is idempotent: a second promotion returns the same application, alreadyPromoted true', async () => {
    promoteVacancyToApplication.mockResolvedValue({
      ok: true,
      application: { id: 'app-1', company: 'Acme' },
      alreadyPromoted: true,
    })
    const res = await POST(makeRequest(), { params: { id: 'v1' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alreadyPromoted).toBe(true)
    expect(body.application.id).toBe('app-1')
  })

  it('returns 500 if the transaction throws', async () => {
    promoteVacancyToApplication.mockRejectedValue(new Error('db down'))
    const res = await POST(makeRequest(), { params: { id: 'v1' } })
    expect(res.status).toBe(500)
  })
})
