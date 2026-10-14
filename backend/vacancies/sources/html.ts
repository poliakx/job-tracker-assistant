// Extractors for the structured data job boards embed in their HTML — the
// same data any browser visiting the page receives. Reading these is far
// more robust than scraping markup, so prefer them when a site offers one.

// Next.js sites ship their server-side props as JSON for hydration.
export function extractNextData(html: string, source: string): unknown {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) throw new Error(`${source}: __NEXT_DATA__ not found — page markup may have changed`)
  return JSON.parse(match[1])
}

// Every schema.org JSON-LD object on the page, with @graph containers and
// top-level arrays flattened. Blocks that aren't valid JSON are skipped —
// one broken block shouldn't hide the others.
export function extractJsonLd(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  for (const match of html.matchAll(re)) {
    let parsed: unknown
    try {
      parsed = JSON.parse(match[1])
    } catch {
      continue
    }
    const queue = Array.isArray(parsed) ? parsed : [parsed]
    while (queue.length > 0) {
      const item = queue.shift()
      if (!item || typeof item !== 'object') continue
      const obj = item as Record<string, unknown>
      if (Array.isArray(obj['@graph'])) queue.push(...obj['@graph'])
      else results.push(obj)
    }
  }
  return results
}

// The schema.org JobPosting objects on a page (most job boards emit one per
// offer page for Google for Jobs). Validate the result with zod in the
// adapter — field coverage varies by site.
export function extractJobPostings(html: string): Record<string, unknown>[] {
  return extractJsonLd(html).filter(obj => {
    const type = obj['@type']
    return type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))
  })
}
