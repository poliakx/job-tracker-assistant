// Automated vacancy collection (backend/vacancies/sources, the cron endpoint, the
// search API) is switched off by default: vacancies are added by hand on
// /vacancies. The code stays in place; SCRAPING_ENABLED=true turns it back
// on. Read at call time, not import time, so tests can flip it.
export function isScrapingEnabled(): boolean {
  return process.env.SCRAPING_ENABLED === 'true'
}

export const SCRAPING_DISABLED_ERROR = 'automated vacancy collection is disabled (set SCRAPING_ENABLED=true to enable)'
