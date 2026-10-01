import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSourceConfig, findSourceConfig } from '@/backend/db'
import { isScrapingEnabled } from '@/backend/scraping'
import { listSourceInfo } from '@/backend/sources'
import { SOURCE_KINDS, normalizeIdentifier } from '@/backend/sources/configured'
import { isUrlAllowed } from '@/backend/sources/http'
import type { SourcesResponse } from '@/types'

export const dynamic = 'force-dynamic'

// GET — every source (code adapters and UI-configured ones, including
// switched-off ones) with the legal basis recorded for each.
export async function GET() {
  try {
    const body: SourcesResponse = { scrapingEnabled: isScrapingEnabled(), sources: await listSourceInfo() }
    return NextResponse.json(body)
  } catch (e) {
    return NextResponse.json({ error: 'failed to load sources' }, { status: 500 })
  }
}

// The terms check is the whole point of this form: a source can't be
// saved without the page that was read, what it says, and an explicit
// confirmation that it allows automated access.
const NewSourceSchema = z.object({
  kind: z.enum(['greenhouse', 'lever', 'ashby', 'rss', 'jsonld']),
  identifier: z.string().trim().min(1, 'enter the board name or URL').max(500),
  label: z.string().trim().min(1, 'give the source a name').max(100),
  termsUrl: z
    .string()
    .trim()
    .url('the terms link must be a full URL')
    .refine(u => /^https?:\/\//i.test(u), 'the terms link must be an http(s) URL'),
  termsNote: z.string().trim().min(20, 'say in a sentence what in the terms allows automated access').max(2000),
  termsConfirmed: z.literal(true, { message: 'confirm that you checked the terms' }),
})

// POST — add a source. Rejected if the identifier is malformed, if the
// source already exists, or if robots.txt disallows the URL a run would
// fetch (checked now, so a bad source fails here and not silently later).
export async function POST(req: NextRequest) {
  const parsed = NewSourceSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid source' }, { status: 400 })
  }
  const { kind, label, termsUrl, termsNote } = parsed.data

  const identifier = normalizeIdentifier(kind, parsed.data.identifier)
  if (!identifier.ok) return NextResponse.json({ error: identifier.error }, { status: 400 })

  try {
    if (await findSourceConfig(kind, identifier.value)) {
      return NextResponse.json({ error: 'this source has already been added' }, { status: 409 })
    }

    const fetchUrl = SOURCE_KINDS[kind].fetchUrl(identifier.value)
    if (!(await isUrlAllowed(fetchUrl))) {
      return NextResponse.json(
        { error: `robots.txt of ${new URL(fetchUrl).host} does not allow fetching ${fetchUrl} (or it could not be read) — this source can't be used` },
        { status: 422 }
      )
    }

    const created = await createSourceConfig({ kind, identifier: identifier.value, label, termsUrl, termsNote })
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'failed to add the source' }, { status: 500 })
  }
}
