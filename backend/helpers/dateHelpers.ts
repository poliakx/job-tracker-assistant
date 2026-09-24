// Generic date-parsing helpers shared by source adapters.

// a job board's own field names (publicationDateUtc,
// dateOfInitialPublicationUtc) claim UTC but the values come back with no
// "Z"/offset (e.g. "2026-09-23T11:10:37.547"), so `new Date(...)` would
// silently read them as local time on whatever machine runs this — a
// couple of hours off. Confirmed against the real site's response before
// writing this fix.
export function parseUtcDate(value: string): Date {
  return new Date(/Z$|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`)
}
