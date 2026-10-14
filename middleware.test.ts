import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { middleware } from './middleware'
import { createSessionToken, SESSION_COOKIE } from '@/backend/auth'

function request(path: string, cookie?: string) {
  const req = new NextRequest(`http://localhost${path}`)
  if (cookie) req.cookies.set(SESSION_COOKIE, cookie)
  return req
}

describe('middleware', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lets everything through in local development without a password', async () => {
    vi.stubEnv('APP_PASSWORD', '')
    vi.stubEnv('NODE_ENV', 'development')
    const res = await middleware(request('/profile'))
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  describe('with APP_PASSWORD set', () => {
    it('redirects a page request without a session to /login, keeping where it was going', async () => {
      vi.stubEnv('APP_PASSWORD', 'pw')
      const res = await middleware(request('/resume?x=1'))
      expect(res.status).toBe(307)
      const location = new URL(res.headers.get('location') as string)
      expect(location.pathname).toBe('/login')
      expect(location.searchParams.get('next')).toBe('/resume?x=1')
    })

    it('answers an API request without a session with 401', async () => {
      vi.stubEnv('APP_PASSWORD', 'pw')
      const res = await middleware(request('/api/profile'))
      expect(res.status).toBe(401)
    })

    it('lets a request with a valid session through', async () => {
      vi.stubEnv('APP_PASSWORD', 'pw')
      const res = await middleware(request('/api/profile', await createSessionToken('pw')))
      expect(res.headers.get('x-middleware-next')).toBe('1')
    })

    it('rejects a session signed with another password', async () => {
      vi.stubEnv('APP_PASSWORD', 'pw')
      const res = await middleware(request('/api/profile', await createSessionToken('other')))
      expect(res.status).toBe(401)
    })

    it('keeps the sign-in page and its API public', async () => {
      vi.stubEnv('APP_PASSWORD', 'pw')
      for (const path of ['/login', '/api/auth/login', '/api/auth/logout']) {
        expect((await middleware(request(path))).headers.get('x-middleware-next')).toBe('1')
      }
    })
  })

  it('blocks everything in production when APP_PASSWORD is missing', async () => {
    vi.stubEnv('APP_PASSWORD', '')
    vi.stubEnv('NODE_ENV', 'production')
    expect((await middleware(request('/api/applications'))).status).toBe(401)
    expect((await middleware(request('/'))).status).toBe(307)
  })
})
