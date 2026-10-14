import { beforeEach, describe, expect, it, vi } from 'vitest'
import greenhouse from './__fixtures__/greenhouse-jobs.json'
import ashby from './__fixtures__/ashby-jobs.json'

const fetchJson = vi.fn()
const fetchText = vi.fn()
vi.mock('./http', () => ({ createPoliteClient: () => ({ fetchJson, fetchText }) }))

const { buildConfiguredSource, normalizeIdentifier, SOURCE_KINDS } = await import('./configured')

const base = {
  id: 'cfg1',
  label: 'Example Corp',
  termsUrl: 'https://example.com/terms',
  termsNote: 'Allowed.',
  termsConfirmedAt: new Date('2026-09-30T00:00:00Z'),
}

describe('normalizeIdentifier', () => {
  it('accepts board slugs and rejects anything path-like', () => {
    expect(normalizeIdentifier('greenhouse', '  examplecorp ')).toEqual({ ok: true, value: 'examplecorp' })
    expect(normalizeIdentifier('lever', 'example-corp_2')).toEqual({ ok: true, value: 'example-corp_2' })
    expect(normalizeIdentifier('ashby', '../admin').ok).toBe(false)
    expect(normalizeIdentifier('greenhouse', 'a/b').ok).toBe(false)
  })

  it('accepts public https URLs and drops the fragment', () => {
    expect(normalizeIdentifier('rss', 'https://jobs.example.com/feed.xml#top')).toEqual({
      ok: true,
      value: 'https://jobs.example.com/feed.xml',
    })
  })

  it.each([
    'http://jobs.example.com/feed.xml',
    'https://localhost/feed',
    'https://127.0.0.1/feed',
    'https://[::1]/feed',
    'https://printer.local/feed',
    'https://intranet/feed',
    'https://user:pass@example.com/feed',
    'ftp://example.com/feed',
    'not a url',
  ])('rejects %s', url => {
    expect(normalizeIdentifier('jsonld', url).ok).toBe(false)
  })
})

describe('SOURCE_KINDS.fetchUrl', () => {
  it('builds the public API URL for each ATS', () => {
    expect(SOURCE_KINDS.greenhouse.fetchUrl('acme')).toBe('https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true')
    expect(SOURCE_KINDS.lever.fetchUrl('acme')).toBe('https://api.lever.co/v0/postings/acme?mode=json')
    expect(SOURCE_KINDS.ashby.fetchUrl('acme')).toBe('https://api.ashbyhq.com/posting-api/job-board/acme')
  })
})

describe('buildConfiguredSource', () => {
  beforeEach(() => {
    fetchJson.mockReset()
    fetchText.mockReset()
  })

  it('names the source after kind and id and carries the recorded legal basis', () => {
    const source = buildConfiguredSource({ ...base, kind: 'greenhouse', identifier: 'acme' })
    expect(source.name).toBe('greenhouse:cfg1')
    expect(source.legal).toEqual({ access: 'official-api', termsUrl: base.termsUrl, termsNote: 'Allowed.', reviewedAt: '2026-09-30' })
  })

  it('fetches a Greenhouse board, newest first, tagged with the source name', async () => {
    fetchJson.mockResolvedValue(greenhouse)
    const vacancies = await buildConfiguredSource({ ...base, kind: 'greenhouse', identifier: 'acme' }).fetchRecent()
    expect(fetchJson).toHaveBeenCalledWith('https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true')
    expect(vacancies.map(v => v.externalId)).toEqual(['4012346', '4012345'])
    expect(vacancies.every(v => v.source === 'greenhouse:cfg1')).toBe(true)
  })

  it('skips unlisted Ashby jobs', async () => {
    fetchJson.mockResolvedValue(ashby)
    const vacancies = await buildConfiguredSource({ ...base, kind: 'ashby', identifier: 'acme' }).fetchRecent()
    expect(vacancies.map(v => v.title)).toEqual(['Junior Software Engineer'])
  })

  it('fails loudly when an API answers with an unexpected shape', async () => {
    fetchJson.mockResolvedValue({ unexpected: true })
    await expect(buildConfiguredSource({ ...base, kind: 'greenhouse', identifier: 'acme' }).fetchRecent()).rejects.toThrow(
      /greenhouse: unexpected response shape/
    )
  })

  it('reads an RSS feed, using the label as the company', async () => {
    fetchText.mockResolvedValue(
      '<rss><channel><item><title>Remote Junior Dev</title><link>https://example.com/j/1</link><description>&lt;p&gt;Hi&lt;/p&gt;</description></item></channel></rss>'
    )
    const [vacancy] = await buildConfiguredSource({ ...base, kind: 'rss', identifier: 'https://example.com/feed' }).fetchRecent()
    expect(vacancy).toMatchObject({ source: 'rss:cfg1', externalId: 'https://example.com/j/1', company: 'Example Corp', remote: true, description: 'Hi' })
  })

  it('reads JobPostings from a page, including ones inside an ItemList', async () => {
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, item: { '@type': 'JobPosting', title: 'Role A', url: 'https://example.com/a' } },
        { '@type': 'JobPosting', title: 'Role B', url: 'https://example.com/b' },
      ],
    }
    fetchText.mockResolvedValue(`<html><script type="application/ld+json">${JSON.stringify(ld)}</script></html>`)
    const vacancies = await buildConfiguredSource({ ...base, kind: 'jsonld', identifier: 'https://example.com/careers' }).fetchRecent()
    expect(vacancies.map(v => v.title).sort()).toEqual(['Role A', 'Role B'])
  })
})
