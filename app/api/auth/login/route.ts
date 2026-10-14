import { NextRequest, NextResponse } from 'next/server'
import { authMode, createSessionToken, passwordMatches, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/backend/auth'

export const dynamic = 'force-dynamic'

// Slows down guessing. Serverless instances don't share memory, so a
// per-IP counter wouldn't hold — a long APP_PASSWORD is the real defense.
const FAILED_ATTEMPT_DELAY_MS = 1000

// POST { password } — sets the session cookie on the right password.
export async function POST(req: NextRequest) {
  const mode = authMode()
  if (mode === 'open') return NextResponse.json({ ok: true })
  if (mode === 'locked') {
    return NextResponse.json({ error: 'APP_PASSWORD is not set on the server, so signing in is disabled' }, { status: 503 })
  }

  const body: unknown = await req.json().catch(() => null)
  const given = body && typeof body === 'object' && 'password' in body && typeof body.password === 'string' ? body.password : ''
  const password = process.env.APP_PASSWORD as string

  if (!given || !(await passwordMatches(given, password))) {
    await new Promise(resolve => setTimeout(resolve, FAILED_ATTEMPT_DELAY_MS))
    return NextResponse.json({ error: 'wrong password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, await createSessionToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Lax: sent when the owner follows a link to the app, but not on
    // cross-site POSTs — so another site can't make API calls as them.
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
  return res
}
