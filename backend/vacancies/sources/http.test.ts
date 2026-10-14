import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearRobotsCache, createPoliteClient, RobotsDisallowedError } from './http'
import { userAgent } from '@/backend/shared/http/userAgent'

const fetchMock = vi.fn()

function response(status: number, body: string | null = null, headers: Record<string, string> = {}) {
  return new Response(body, { status, headers })
}

// Routes robots.txt requests to `robots` and everything else to `pages`.
function route(robots: () => Response, pages: (url: string) => Response) {
  fetchMock.mockImplementation(async (url: string) => (url.endsWith('/robots.txt') ? robots() : pages(url)))
}

beforeEach(() => {
  clearRobotsCache()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createPoliteClient', () => {
  const client = () => createPoliteClient({ source: 'test', minDelayMs: 0 })

  it('fetches an allowed page with our User-Agent', async () => {
    route(() => response(200, 'User-agent: *\nDisallow: /api/'), () => response(200, 'hello'))
    expect(await client().fetchText('https://example.com/jobs')).toBe('hello')
    const [, init] = fetchMock.mock.calls.find(([url]) => url === 'https://example.com/jobs')!
    expect(init.headers['User-Agent']).toBe(userAgent())
  })

  it('refuses a robots.txt-disallowed URL without requesting it', async () => {
    route(() => response(200, 'User-agent: *\nDisallow: /api/'), () => response(200, 'secret'))
    await expect(client().fetchText('https://example.com/api/offers')).rejects.toBeInstanceOf(RobotsDisallowedError)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['https://example.com/robots.txt'])
  })

  it('treats a missing robots.txt (4xx) as no restrictions', async () => {
    route(() => response(404), () => response(200, 'ok'))
    expect(await client().fetchText('https://example.com/anything')).toBe('ok')
  })

  it('treats an unreachable robots.txt (5xx) as disallow-all', async () => {
    route(() => response(503), () => response(200, 'ok'))
    await expect(client().fetchText('https://example.com/jobs')).rejects.toBeInstanceOf(RobotsDisallowedError)
  })

  it('fetches robots.txt once per origin', async () => {
    route(() => response(200, ''), () => response(200, 'ok'))
    const c = client()
    await c.fetchText('https://example.com/a')
    await c.fetchText('https://example.com/b')
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/robots.txt'))).toHaveLength(1)
  })

  it('retries a 429 honouring Retry-After, then succeeds', async () => {
    let calls = 0
    route(
      () => response(404),
      () => (++calls === 1 ? response(429, null, { 'Retry-After': '0' }) : response(200, 'ok'))
    )
    expect(await client().fetchText('https://example.com/jobs')).toBe('ok')
    expect(calls).toBe(2)
  })

  it('throws a source-prefixed error on other failures', async () => {
    route(() => response(404), () => response(404))
    await expect(client().fetchText('https://example.com/gone')).rejects.toThrow(/^test: 404/)
  })

  it('parses JSON', async () => {
    route(() => response(404), () => response(200, '{"a":1}'))
    expect(await client().fetchJson('https://example.com/data.json')).toEqual({ a: 1 })
  })
})
