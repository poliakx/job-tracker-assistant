// Sources added from /sources without writing code. Each SourceConfig row
// (prisma/schema.prisma) becomes a VacancySource here. Only formats a site
// publishes *for* automated reading are supported:
// - greenhouse / lever / ashby: the public job-board APIs these applicant
//   tracking systems provide so companies can list their openings anywhere;
// - rss: an RSS 2.0 or Atom feed of job offers;
// - jsonld: a page embedding schema.org JobPosting data (what sites add for
//   Google for Jobs and other aggregators).
// There is deliberately no "scrape any HTML" kind. Every request still goes
// through createPoliteClient, so robots.txt, the User-Agent and rate limits
// apply exactly as for code adapters.
import { z } from 'zod'
import { normalizeAshbyJob, normalizeGreenhouseJob, normalizeLeverPosting, type NormalizedPosting } from '@/backend/helpers/atsNormalizers'
import { parseFeed } from '@/backend/helpers/feedParser'
import { htmlToText } from '@/backend/helpers/htmlText'
import { normalizeJobPosting } from '@/backend/helpers/jobPostingNormalizer'
import type { SourceAccess, SourceKind } from '@/types'
import { extractJsonLd } from './html'
import { createPoliteClient, type PoliteClient } from './http'
import type { RawVacancy, VacancySource } from './types'

// A big board can list hundreds of openings; the filter and the daily
// analysis cap bound the cost downstream, this bounds one fetch.
export const MAX_VACANCIES_PER_SOURCE = 100

export interface SourceConfigLike {
  id: string
  kind: SourceKind
  identifier: string
  label: string
  termsUrl: string
  termsNote: string
  termsConfirmedAt: Date
}

// --- API response schemas (only the fields we read) -----------------------

const GreenhouseResponseSchema = z.object({
  jobs: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      absolute_url: z.string(),
      location: z.object({ name: z.string().nullish() }).nullish(),
      updated_at: z.string().nullish(),
      first_published: z.string().nullish(),
      content: z.string().nullish(),
      company_name: z.string().nullish(),
    })
  ),
})

const LeverResponseSchema = z.array(
  z.object({
    id: z.string(),
    text: z.string(),
    hostedUrl: z.string(),
    createdAt: z.number().nullish(),
    workplaceType: z.string().nullish(),
    categories: z.object({ location: z.string().nullish(), allLocations: z.array(z.string()).nullish() }).nullish(),
    descriptionPlain: z.string().nullish(),
    description: z.string().nullish(),
    lists: z.array(z.object({ text: z.string().nullish(), content: z.string().nullish() })).nullish(),
    additionalPlain: z.string().nullish(),
  })
)

const AshbyResponseSchema = z.object({
  jobs: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      jobUrl: z.string(),
      location: z.string().nullish(),
      isRemote: z.boolean().nullish(),
      isListed: z.boolean().nullish(),
      workplaceType: z.string().nullish(),
      publishedAt: z.string().nullish(),
      descriptionPlain: z.string().nullish(),
      descriptionHtml: z.string().nullish(),
    })
  ),
})

// --- Kinds ------------------------------------------------------------------

interface KindSpec {
  access: SourceAccess
  identifier: 'slug' | 'url'
  // The one URL a run fetches — also what robots.txt is checked against
  // when the source is added.
  fetchUrl(identifier: string): string
  fetchPostings(client: PoliteClient, config: SourceConfigLike): Promise<NormalizedPosting[]>
}

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown, what: string): T {
  const parsed = schema.safeParse(data)
  if (!parsed.success) throw new Error(`${what}: unexpected response shape — ${parsed.error.issues[0]?.message ?? 'invalid'}`)
  return parsed.data
}

// schema.org JobPostings on a page, including ones wrapped in an ItemList
// (a careers page listing several offers).
function jobPostingsFrom(html: string): Record<string, unknown>[] {
  const isPosting = (o: Record<string, unknown>) => o['@type'] === 'JobPosting' || (Array.isArray(o['@type']) && o['@type'].includes('JobPosting'))
  const out: Record<string, unknown>[] = []
  for (const obj of extractJsonLd(html)) {
    if (isPosting(obj)) out.push(obj)
    else if (Array.isArray(obj.itemListElement)) {
      for (const el of obj.itemListElement) {
        if (!el || typeof el !== 'object') continue
        const e = el as Record<string, unknown>
        const item = (e.item && typeof e.item === 'object' ? e.item : e) as Record<string, unknown>
        if (isPosting(item)) out.push(item)
      }
    }
  }
  return out
}

export const SOURCE_KINDS: Record<SourceKind, KindSpec> = {
  greenhouse: {
    access: 'official-api',
    identifier: 'slug',
    fetchUrl: board => `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,
    async fetchPostings(client, config) {
      const data = parseOrThrow(GreenhouseResponseSchema, await client.fetchJson(this.fetchUrl(config.identifier)), 'greenhouse')
      return data.jobs.map(job => normalizeGreenhouseJob(job, config.label))
    },
  },
  lever: {
    access: 'official-api',
    identifier: 'slug',
    fetchUrl: company => `https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`,
    async fetchPostings(client, config) {
      const data = parseOrThrow(LeverResponseSchema, await client.fetchJson(this.fetchUrl(config.identifier)), 'lever')
      return data.map(posting => normalizeLeverPosting(posting, config.label))
    },
  },
  ashby: {
    access: 'official-api',
    identifier: 'slug',
    fetchUrl: board => `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`,
    async fetchPostings(client, config) {
      const data = parseOrThrow(AshbyResponseSchema, await client.fetchJson(this.fetchUrl(config.identifier)), 'ashby')
      return data.jobs.filter(job => job.isListed !== false).map(job => normalizeAshbyJob(job, config.label))
    },
  },
  rss: {
    access: 'feed',
    identifier: 'url',
    fetchUrl: url => url,
    async fetchPostings(client, config) {
      const xml = await client.fetchText(config.identifier, { headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' } })
      return parseFeed(xml).map(item => ({
        externalId: item.id,
        title: item.title,
        // Feeds rarely carry the employer as a field; the label the user
        // gave the source stands in (the description usually names it).
        company: config.label,
        url: item.link,
        location: 'Not specified',
        remote: /remote|zdaln/i.test(item.title),
        description: htmlToText(item.content),
        postedAt: item.published,
      }))
    },
  },
  jsonld: {
    access: 'structured-data',
    identifier: 'url',
    fetchUrl: url => url,
    async fetchPostings(client, config) {
      const html = await client.fetchText(config.identifier)
      return jobPostingsFrom(html)
        .map(posting => normalizeJobPosting(posting, config.identifier, config.label))
        .filter((p): p is NormalizedPosting => p !== null)
    },
  },
}

// --- Identifier validation ----------------------------------------------------

const SLUG_RE = /^[a-z0-9][a-z0-9._-]{0,99}$/i

// The server fetches these URLs, so keep them to public https hosts: no
// localhost, bare IP addresses or internal-only names.
function isPublicHttpsUrl(url: URL): boolean {
  if (url.protocol !== 'https:' || url.username || url.password) return false
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || /\.(localhost|local|internal|lan|home)$/.test(host)) return false
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) return false
  return host.includes('.')
}

export function normalizeIdentifier(kind: SourceKind, raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim()
  if (SOURCE_KINDS[kind].identifier === 'slug') {
    return SLUG_RE.test(value)
      ? { ok: true, value }
      : { ok: false, error: 'the board name may only contain letters, digits, ".", "-" and "_"' }
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return { ok: false, error: 'not a valid URL' }
  }
  if (!isPublicHttpsUrl(url)) return { ok: false, error: 'use a public https:// URL (no localhost or IP addresses)' }
  url.hash = ''
  return { ok: true, value: url.toString() }
}

// --- Building a VacancySource ---------------------------------------------------

export function configuredSourceName(config: Pick<SourceConfigLike, 'kind' | 'id'>): string {
  return `${config.kind}:${config.id}`
}

export function buildConfiguredSource(config: SourceConfigLike): VacancySource {
  const spec = SOURCE_KINDS[config.kind]
  const name = configuredSourceName(config)
  return {
    name,
    label: config.label,
    legal: {
      access: spec.access,
      termsUrl: config.termsUrl,
      termsNote: config.termsNote,
      reviewedAt: config.termsConfirmedAt.toISOString().slice(0, 10),
    },
    async fetchRecent(): Promise<RawVacancy[]> {
      const client = createPoliteClient({ source: name })
      const postings = await spec.fetchPostings(client, config)
      return postings
        .sort((a, b) => (b.postedAt?.getTime() ?? 0) - (a.postedAt?.getTime() ?? 0))
        .slice(0, MAX_VACANCIES_PER_SOURCE)
        .map(p => ({ ...p, source: name }))
    },
  }
}
