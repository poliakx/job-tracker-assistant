import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getVacancies = vi.fn()
const updateVacancy = vi.fn()
const createVacancy = vi.fn()

const extractVacancyDetails = vi.fn()

vi.mock('@/backend/vacancies/repository', () => ({ getVacancies, updateVacancy, createVacancy }))
vi.mock('@/backend/vacancies/details/extract', () => ({ extractVacancyDetails }))

const { GET, PATCH, POST } = await import('./route')

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
    expect(getVacancies).toHaveBeenCalledWith({ status: undefined, minScore: undefined, manual: undefined })
  })

  it('passes status and minScore through to getVacancies', async () => {
    getVacancies.mockResolvedValue([])
    await GET(getRequest('?status=SHORTLISTED&minScore=50'))
    expect(getVacancies).toHaveBeenCalledWith({ status: 'SHORTLISTED', minScore: 50, manual: undefined })
  })

  it('passes the manual filter through as a boolean', async () => {
    getVacancies.mockResolvedValue([])
    await GET(getRequest('?manual=true'))
    expect(getVacancies).toHaveBeenLastCalledWith({ status: undefined, minScore: undefined, manual: true })
    await GET(getRequest('?manual=false'))
    expect(getVacancies).toHaveBeenLastCalledWith({ status: undefined, minScore: undefined, manual: false })
  })

  it('rejects an invalid manual value with 400', async () => {
    const res = await GET(getRequest('?manual=yes'))
    expect(res.status).toBe(400)
    expect(getVacancies).not.toHaveBeenCalled()
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

  it('rejects an unknown status with 400', async () => {
    const res = await PATCH(patchRequest({ id: 'v1', status: 'ARCHIVED' }))
    expect(res.status).toBe(400)
    expect(updateVacancy).not.toHaveBeenCalled()
  })

  it('only passes the status through, never score/analysis/application fields', async () => {
    updateVacancy.mockResolvedValue({ id: 'v1' })
    await PATCH(patchRequest({ id: 'v1', status: 'DISMISSED', fitScore: 100, applicationId: 'a1', analysis: {} }))
    expect(updateVacancy).toHaveBeenCalledWith('v1', { status: 'DISMISSED' })
  })
})

describe('POST /api/vacancies', () => {
  const text = 'Junior Node.js Developer\nAcme Sp. z o.o. — Warsaw\nRequirements: TypeScript, PostgreSQL, REST.'

  function postRequest(body: unknown) {
    return new NextRequest('http://localhost/api/vacancies', { method: 'POST', body: JSON.stringify(body) })
  }

  beforeEach(() => {
    createVacancy.mockReset()
    extractVacancyDetails.mockReset()
    createVacancy.mockImplementation(async data => ({ id: 'v1', ...data }))
  })

  it('creates a manual vacancy from pasted text, using the extracted details', async () => {
    extractVacancyDetails.mockResolvedValue({
      ok: true,
      result: { title: 'Junior Node.js Developer', company: 'Acme', location: 'Warsaw', remote: false, url: '' },
      usage: {},
    })
    const res = await POST(postRequest({ text }))
    expect(res.status).toBe(201)
    const data = createVacancy.mock.calls[0][0]
    expect(data).toMatchObject({
      title: 'Junior Node.js Developer',
      company: 'Acme',
      location: 'Warsaw',
      remote: false,
      url: '',
      source: 'manual',
      description: text,
    })
    expect(data.externalId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('still adds the vacancy when extraction fails, titled by its first line', async () => {
    extractVacancyDetails.mockResolvedValue({ ok: false, error: 'cut off', usage: {} })
    const res = await POST(postRequest({ text }))
    expect(res.status).toBe(201)
    expect(createVacancy.mock.calls[0][0]).toMatchObject({ title: 'Junior Node.js Developer', company: 'Unknown company' })
  })

  it('uses a placeholder company when the posting names none', async () => {
    extractVacancyDetails.mockResolvedValue({
      ok: true,
      result: { title: 'Junior Dev', company: '', location: '', remote: null, url: '' },
      usage: {},
    })
    await POST(postRequest({ text }))
    const data = createVacancy.mock.calls[0][0]
    expect(data.company).toBe('Unknown company')
    expect(data.location).toBeUndefined()
    expect(data.remote).toBeUndefined()
  })

  it('rejects text too short to score against, without calling the model', async () => {
    const res = await POST(postRequest({ text: 'Node.js' }))
    expect(res.status).toBe(400)
    expect(extractVacancyDetails).not.toHaveBeenCalled()
    expect(createVacancy).not.toHaveBeenCalled()
  })
})
