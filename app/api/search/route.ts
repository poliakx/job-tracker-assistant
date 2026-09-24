import { NextRequest, NextResponse } from 'next/server'
import { findSource, sources } from '@/backend/sources'
import { PipelineRunError, runPipeline } from '@/backend/runPipeline'

export const dynamic = 'force-dynamic'

// GET — the sources the dashboard can search, for its per-source buttons.
export async function GET() {
  return NextResponse.json(sources.map(s => ({ name: s.name, label: s.label })))
}

// POST { source?: string } — run the pipeline now, for one source or (no
// source given) all of them. Same code path as the scheduled cron run; the
// daily analysis cap (ANALYSIS_DAILY_CAP) still bounds LLM cost.
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => ({}))
  const sourceName =
    body && typeof body === 'object' && 'source' in body && typeof body.source === 'string' ? body.source : undefined

  let toRun = sources
  if (sourceName !== undefined) {
    const source = findSource(sourceName)
    if (!source) return NextResponse.json({ error: `unknown source: ${sourceName}` }, { status: 400 })
    toRun = [source]
  }

  try {
    return NextResponse.json(await runPipeline(toRun))
  } catch (err) {
    const runId = err instanceof PipelineRunError ? err.runId : undefined
    return NextResponse.json({ error: 'search failed', runId }, { status: 500 })
  }
}
