// The User-Agent every outgoing request of the app sends — the job-source
// HTTP client and the GitHub import alike.
// The contact address comes from the environment so it isn't published with
// the code; without it the User-Agent still names the tool honestly. Read at
// call time, not import time, so it doesn't depend on when .env was loaded.
export function userAgent(): string {
  const contact = process.env.SCRAPER_CONTACT_EMAIL
  return `ApplicationTrackerBot/0.1 (personal job-search tool${contact ? `; contact: ${contact}` : ''})`
}
