// The one HTTP client every job-board adapter must use, so PLAN.md rule 9
// ("be a polite client") holds for every source by construction instead of
// by each adapter remembering to do it:
// - an honest User-Agent with a contact address,
// - robots.txt checked before every request (a disallowed URL throws),
// - a minimum delay between requests to the same source,
// - a request timeout, and a bounded, Retry-After-aware retry on 429/503.
// It deliberately does nothing to get around anti-bot protection — a 403 or
// a captcha page is a signal to drop the source, not to work around it.
import { isAllowed } from './robots'

// The contact address comes from the environment so it isn't published with
// the code; without it the User-Agent still names the tool honestly. Read at
// call time, not import time, so it doesn't depend on when .env was loaded.
export function userAgent(): string {
  const contact = process.env.SCRAPER_CONTACT_EMAIL
  return `ApplicationTrackerBot/0.1 (personal job-search tool${contact ? `; contact: ${contact}` : ''})`
}

const DEFAULT_MIN_DELAY_MS = 500
const REQUEST_TIMEOUT_MS = 15_000
const MAX_RETRIES = 2
const MAX_RETRY_WAIT_MS = 30_000

export class RobotsDisallowedError extends Error {
  constructor(public url: string) {
    super(`robots.txt disallows ${url}`)
  }
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

// --- robots.txt, cached per origin for the life of the process ----------

// null = no restrictions (robots.txt missing); a string = its contents.
const robotsCache = new Map<string, Promise<string | null>>()

async function loadRobots(origin: string): Promise<string | null> {
  const res = await fetch(`${origin}/robots.txt`, {
    headers: { 'User-Agent': userAgent() },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (res.ok) return res.text()
  // RFC 9309: 4xx ("unavailable") means no restrictions; 5xx or a network
  // failure ("unreachable") means assume everything is disallowed.
  if (res.status >= 400 && res.status < 500) return null
  throw new Error(`robots.txt unreachable for ${origin}: ${res.status}`)
}

export async function isUrlAllowed(url: string): Promise<boolean> {
  const { origin, pathname, search } = new URL(url)
  let robots = robotsCache.get(origin)
  if (!robots) {
    robots = loadRobots(origin)
    robotsCache.set(origin, robots)
    // Don't cache a failure forever — the next run should try again.
    robots.catch(() => robotsCache.delete(origin))
  }
  let txt: string | null
  try {
    txt = await robots
  } catch {
    return false
  }
  return txt === null || isAllowed(txt, userAgent(), pathname + search)
}

// Test hook: forget cached robots.txt files.
export function clearRobotsCache() {
  robotsCache.clear()
}

// --- Client ----------------------------------------------------------------

export interface PoliteClientOptions {
  // Used as the prefix of error messages, e.g. "greenhouse: 404 ...".
  source: string
  minDelayMs?: number
  headers?: Record<string, string>
}

export interface PoliteClient {
  fetchText(url: string, init?: RequestInit): Promise<string>
  fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T>
}

function retryDelayMs(res: Response, attempt: number): number {
  const header = res.headers.get('Retry-After')
  const seconds = header !== null ? Number(header) : NaN
  const ms = Number.isFinite(seconds) ? seconds * 1000 : 2 ** attempt * 1000
  return Math.min(ms, MAX_RETRY_WAIT_MS)
}

export function createPoliteClient({ source, minDelayMs = DEFAULT_MIN_DELAY_MS, headers }: PoliteClientOptions): PoliteClient {
  let lastRequestAt = 0

  async function throttle() {
    const wait = lastRequestAt + minDelayMs - Date.now()
    if (wait > 0) await sleep(wait)
    lastRequestAt = Date.now()
  }

  async function request(url: string, init: RequestInit = {}): Promise<Response> {
    if (!(await isUrlAllowed(url))) throw new RobotsDisallowedError(url)

    for (let attempt = 0; ; attempt++) {
      await throttle()
      const res = await fetch(url, {
        ...init,
        headers: { ...headers, ...(init.headers as Record<string, string> | undefined), 'User-Agent': userAgent() },
        signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
        await sleep(retryDelayMs(res, attempt))
        continue
      }
      if (!res.ok) throw new Error(`${source}: ${res.status} ${res.statusText} fetching ${url}`)
      return res
    }
  }

  return {
    async fetchText(url, init) {
      return (await request(url, init)).text()
    },
    async fetchJson<T>(url: string, init?: RequestInit) {
      const res = await request(url, { ...init, headers: { Accept: 'application/json', ...(init?.headers as Record<string, string>) } })
      return (await res.json()) as T
    },
  }
}
