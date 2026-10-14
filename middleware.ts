import { NextRequest, NextResponse } from 'next/server'
import { authMode, SESSION_COOKIE, verifySessionToken } from '@/backend/auth/session'

// Reachable without signing in: the sign-in page and its API.
const PUBLIC_PATHS = new Set(['/login', '/api/auth/login', '/api/auth/logout'])

// Every page and API route needs a session when APP_PASSWORD is set (see
// backend/auth/session.ts). Pages redirect to /login; API routes answer 401.
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next()

  const mode = authMode()
  if (mode === 'open') return NextResponse.next()

  if (mode === 'password') {
    const token = req.cookies.get(SESSION_COOKIE)?.value
    if (token && (await verifySessionToken(token, process.env.APP_PASSWORD as string))) return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    const error = mode === 'locked' ? 'APP_PASSWORD is not set on the server' : 'sign in required'
    return NextResponse.json({ error }, { status: 401 })
  }
  const login = new URL('/login', req.url)
  login.searchParams.set('next', pathname + search)
  return NextResponse.redirect(login)
}

export const config = {
  // Static assets, the PWA manifest/icons, and /api/cron (it has its own
  // CRON_SECRET check, and GitHub Actions has no session) are left alone.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|api/cron/).*)'],
}
