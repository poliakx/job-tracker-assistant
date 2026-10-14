// Single-owner password protection for a deployed instance. The app has
// one profile and no accounts, so whoever can open it can read the owner's
// contact details and spend their API key — on the internet it has to be
// behind a password.
//
// Used by middleware.ts, which runs on the edge runtime: Web Crypto only,
// no Node APIs, no Prisma.

export const SESSION_COOKIE = 'jt_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

// open:     no APP_PASSWORD outside production — local `npm run dev` keeps
//           working without setting anything up.
// password: APP_PASSWORD is set — a session cookie is required.
// locked:   production without APP_PASSWORD — nothing is reachable, so a
//           deploy that forgot the password fails closed, not open.
export type AuthMode = 'open' | 'password' | 'locked'

export function authMode(env: Record<string, string | undefined> = process.env): AuthMode {
  if (env.APP_PASSWORD) return 'password'
  return env.NODE_ENV === 'production' ? 'locked' : 'open'
}

const encoder = new TextEncoder()

async function hmacHex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message))
  return Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('')
}

// Compares without returning early, so the time taken doesn't reveal how
// much of a guess was right.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function passwordMatches(given: string, password: string): Promise<boolean> {
  // Hashing both first makes the comparison constant-length too.
  const [a, b] = await Promise.all([hmacHex('password-check', given), hmacHex('password-check', password)])
  return timingSafeEqual(a, b)
}

// "<issued-at ms>.<HMAC of it, keyed by the password>". Stateless: nothing
// is stored server-side, and changing APP_PASSWORD signs everyone out.
export async function createSessionToken(password: string, now = Date.now()): Promise<string> {
  return `${now}.${await hmacHex(password, `session:${now}`)}`
}

export async function verifySessionToken(token: string, password: string, now = Date.now()): Promise<boolean> {
  const [issuedAtText, signature] = token.split('.')
  const issuedAt = Number(issuedAtText)
  if (!signature || !Number.isInteger(issuedAt)) return false
  if (issuedAt > now || now - issuedAt > SESSION_MAX_AGE_SECONDS * 1000) return false
  return timingSafeEqual(signature, await hmacHex(password, `session:${issuedAt}`))
}

