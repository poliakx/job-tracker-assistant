import { NextResponse } from 'next/server'
import { getLatestPipelineRun } from '@/backend/db'

// Without a request param, Next.js tries to statically optimize a GET-only
// route at build time — force it to run fresh every call instead, or the
// "last run" banner would freeze at whatever PipelineRun existed at deploy.
export const dynamic = 'force-dynamic'

// GET — the most recent pipeline run, for the Inbox's "last run" banner
// (Phase 8). Returns null if the pipeline has never run.
export async function GET() {
  try {
    const run = await getLatestPipelineRun()
    return NextResponse.json(run)
  } catch (e) {
    return NextResponse.json({ error: 'failed to load' }, { status: 500 })
  }
}
