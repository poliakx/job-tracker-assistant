import { describe, expect, it } from 'vitest'
import { authMode, createSessionToken, passwordMatches, SESSION_MAX_AGE_SECONDS, verifySessionToken } from './session'

describe('authMode', () => {
  it('requires a session when APP_PASSWORD is set', () => {
    expect(authMode({ APP_PASSWORD: 'secret', NODE_ENV: 'production' })).toBe('password')
    expect(authMode({ APP_PASSWORD: 'secret', NODE_ENV: 'development' })).toBe('password')
  })

  it('stays open in local development without a password', () => {
    expect(authMode({ NODE_ENV: 'development' })).toBe('open')
  })

  it('locks a production deploy that has no password', () => {
    expect(authMode({ NODE_ENV: 'production' })).toBe('locked')
    expect(authMode({ NODE_ENV: 'production', APP_PASSWORD: '' })).toBe('locked')
  })
})

describe('passwordMatches', () => {
  it('accepts only the exact password', async () => {
    expect(await passwordMatches('correct horse', 'correct horse')).toBe(true)
    expect(await passwordMatches('correct hors', 'correct horse')).toBe(false)
    expect(await passwordMatches('', 'correct horse')).toBe(false)
  })
})

describe('session tokens', () => {
  const now = 1_800_000_000_000

  it('verifies a token signed with the same password', async () => {
    const token = await createSessionToken('pw', now)
    expect(await verifySessionToken(token, 'pw', now + 1000)).toBe(true)
  })

  it('rejects a token after the password changes', async () => {
    const token = await createSessionToken('old', now)
    expect(await verifySessionToken(token, 'new', now)).toBe(false)
  })

  it('rejects an expired token', async () => {
    const token = await createSessionToken('pw', now)
    expect(await verifySessionToken(token, 'pw', now + SESSION_MAX_AGE_SECONDS * 1000 + 1)).toBe(false)
  })

  it('rejects a tampered or malformed token', async () => {
    const token = await createSessionToken('pw', now)
    const [, signature] = token.split('.')
    // Moving the issue date forward to extend the session breaks the signature.
    expect(await verifySessionToken(`${now + 60_000}.${signature}`, 'pw', now + 120_000)).toBe(false)
    expect(await verifySessionToken('garbage', 'pw', now)).toBe(false)
    expect(await verifySessionToken('', 'pw', now)).toBe(false)
  })
})
