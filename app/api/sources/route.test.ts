import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const createSourceConfig = vi.fn()
const findSourceConfig = vi.fn()
const isUrlAllowed = vi.fn()
const listSourceInfo = vi.fn()

vi.mock('@/backend/db', () => ({ createSourceConfig, findSourceConfig }))
vi.mock('@/backend/sources', () => ({ listSourceInfo }))
vi.mock('@/backend/sources/http', () => ({ isUrlAllowed, createPoliteClient: () => ({}) }))

const { GET, POST } = await import('./route')

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/sources', { method: 'POST', body: JSON.stringify(body) })
}

const valid = {
  kind: 'greenhouse',
  identifier: 'acme',
  label: 'Acme',
  termsUrl: 'https://developers.greenhouse.io/job-board.html',
  termsNote: 'Public job board API meant for listing open jobs anywhere.',
  termsConfirmed: true,
}

describe('GET /api/sources', () => {
  it('returns the sources and whether collection is on', async () => {
    delete process.env.SCRAPING_ENABLED
    listSourceInfo.mockResolvedValue([{ name: 'x' }])
    const res = await GET()
    expect(await res.json()).toEqual({ scrapingEnabled: false, sources: [{ name: 'x' }] })
  })
})

describe('POST /api/sources', () => {
  beforeEach(() => {
    for (const fn of [createSourceConfig, findSourceConfig, isUrlAllowed]) fn.mockReset()
    findSourceConfig.mockResolvedValue(null)
    isUrlAllowed.mockResolvedValue(true)
    createSourceConfig.mockImplementation(async data => ({ id: 'new', ...data }))
  })

  it('creates a source after checking robots.txt for the URL a run will fetch', async () => {
    const res = await POST(makeRequest(valid))
    expect(res.status).toBe(201)
    expect(isUrlAllowed).toHaveBeenCalledWith('https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true')
    expect(createSourceConfig).toHaveBeenCalledWith({
      kind: 'greenhouse',
      identifier: 'acme',
      label: 'Acme',
      termsUrl: valid.termsUrl,
      termsNote: valid.termsNote,
    })
  })

  it.each([
    ['without the terms confirmation', { ...valid, termsConfirmed: false }],
    ['without a terms link', { ...valid, termsUrl: '' }],
    ['with a one-word terms note', { ...valid, termsNote: 'ok' }],
    ['with an unsupported kind', { ...valid, kind: 'html' }],
    ['with a path-like board name', { ...valid, identifier: '../x' }],
    ['with a private feed URL', { ...valid, kind: 'rss', identifier: 'https://localhost/feed' }],
  ])('rejects a source %s', async (_, body) => {
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
    expect(createSourceConfig).not.toHaveBeenCalled()
  })

  it('rejects a source robots.txt disallows', async () => {
    isUrlAllowed.mockResolvedValue(false)
    const res = await POST(makeRequest(valid))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toMatch(/robots\.txt/)
    expect(createSourceConfig).not.toHaveBeenCalled()
  })

  it('rejects a duplicate', async () => {
    findSourceConfig.mockResolvedValue({ id: 'existing' })
    const res = await POST(makeRequest(valid))
    expect(res.status).toBe(409)
    expect(createSourceConfig).not.toHaveBeenCalled()
  })
})
