import { describe, expect, it } from 'vitest'
import { extractJobPostings, extractJsonLd, extractNextData } from './html'

describe('extractNextData', () => {
  it('parses the __NEXT_DATA__ script', () => {
    const html = '<script id="__NEXT_DATA__" type="application/json">{"props":{"x":1}}</script>'
    expect(extractNextData(html, 'test')).toEqual({ props: { x: 1 } })
  })

  it('throws a source-prefixed error when it is missing', () => {
    expect(() => extractNextData('<html></html>', 'test')).toThrow(/^test: __NEXT_DATA__ not found/)
  })
})

describe('extractJsonLd / extractJobPostings', () => {
  const html = `
    <script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>
    <script type="application/ld+json">not json</script>
    <script type="application/ld+json">{"@graph":[{"@type":"JobPosting","title":"Dev"},{"@type":"WebPage"}]}</script>
    <script type="application/ld+json">[{"@type":["JobPosting","Thing"],"title":"QA"}]</script>`

  it('flattens @graph and arrays, skipping invalid blocks', () => {
    expect(extractJsonLd(html).map(o => o['@type'])).toEqual(['Organization', 'JobPosting', 'WebPage', ['JobPosting', 'Thing']])
  })

  it('keeps only JobPosting objects', () => {
    expect(extractJobPostings(html).map(o => o.title)).toEqual(['Dev', 'QA'])
  })
})
