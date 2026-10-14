import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/backend/auth'

export const dynamic = 'force-dynamic'

// POST — clears the session cookie.
export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
