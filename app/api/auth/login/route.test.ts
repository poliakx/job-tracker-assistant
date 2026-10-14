import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_COOKIE, verifySessionToken } from '@/backend/auth'

const { POST } = await import('./route')

function login(password: unknown) {
  return POST(new NextRequest('http://localhost/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) }))
}

describe('POST /api/auth/login', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sets an httpOnly session cookie on the right password', async () => {
    vi.stubEnv('APP_PASSWORD', 'pw')
    const res = await login('pw')
    expect(res.status).toBe(200)
    const cookie = res.cookies.get(SESSION_COOKIE)
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('lax')
    expect(await verifySessionToken(cookie?.value as string, 'pw')).toBe(true)
  })

  it('rejects a wrong password with 401 and no cookie', async () => {
    vi.stubEnv('APP_PASSWORD', 'pw')
    const res = await login('nope')
    expect(res.status).toBe(401)
    expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined()
  })

  it('refuses to sign in on a production deploy without APP_PASSWORD', async () => {
    vi.stubEnv('APP_PASSWORD', '')
    vi.stubEnv('NODE_ENV', 'production')
    const res = await login('anything')
    expect(res.status).toBe(503)
  })
})
