// Pure normalizer from a schema.org JobPosting (JSON-LD) into RawVacancy
// fields. Field coverage varies a lot between sites, so everything is read
// defensively; a posting without a title is rejected (null).
import { htmlToText } from './htmlText'
import type { NormalizedPosting } from './atsNormalizers'

type Json = Record<string, unknown>

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]
}

function orgName(value: unknown): string | undefined {
  if (typeof value === 'string') return str(value)
  if (value && typeof value === 'object') return str((value as Json).name)
  return undefined
}

function placeName(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return str(value)
  const address = (value as Json).address
  if (typeof address === 'string') return str(address)
  if (address && typeof address === 'object') {
    const a = address as Json
    return [str(a.addressLocality), str(a.addressCountry) ?? orgName(a.addressCountry)].filter(Boolean).join(', ') || undefined
  }
  return str((value as Json).name)
}

function identifier(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object') {
    const v = (value as Json).value
    if (typeof v === 'string' || typeof v === 'number') return String(v)
  }
  return undefined
}

// `pageUrl` is where the posting was found: the fallback URL, and (with
// the title) the fallback id when the posting has neither url nor
// identifier. `fallbackCompany` covers a missing hiringOrganization.
export function normalizeJobPosting(posting: Json, pageUrl: string, fallbackCompany: string): NormalizedPosting | null {
  const title = str(posting.title)
  if (!title) return null

  let url = pageUrl
  const rawUrl = str(posting.url)
  if (rawUrl) {
    try {
      url = new URL(rawUrl, pageUrl).toString()
    } catch {
      // keep pageUrl
    }
  }

  const locations = asArray(posting.jobLocation).map(placeName).filter((l): l is string => Boolean(l))
  const remote = asArray(posting.jobLocationType).some(t => t === 'TELECOMMUTE')
  const posted = str(posting.datePosted)
  const postedAt = posted ? new Date(posted) : null

  return {
    externalId: identifier(posting.identifier) ?? (rawUrl ? url : `${url}#${title}`),
    title,
    company: orgName(posting.hiringOrganization) ?? fallbackCompany,
    url,
    location: locations.join('; ') || (remote ? 'Remote' : 'Not specified'),
    remote,
    description: htmlToText(str(posting.description) ?? ''),
    postedAt: postedAt && !Number.isNaN(postedAt.getTime()) ? postedAt : null,
  }
}
