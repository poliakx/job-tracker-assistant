import { NextRequest, NextResponse } from 'next/server'
import { getSources } from '@/backend/sources'
import { PipelineRunError, runPipeline } from '@/backend/runPipeline'
import { SCRAPING_DISABLED_ERROR, isScrapingEnabled } from '@/backend/scraping'

// Cron routes must not be statically optimized — every invocation needs to
// actually run.
export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!isScrapingEnabled()) {
    return NextResponse.json({ error: SCRAPING_DISABLED_ERROR }, { status: 403 })
  }

  try {
    return NextResponse.json(await runPipeline(await getSources()))
  } catch (err) {
    const runId = err instanceof PipelineRunError ? err.runId : undefined
    return NextResponse.json({ error: 'pipeline run failed', runId }, { status: 500 })
  }
}
