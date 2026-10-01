import { NextResponse } from 'next/server'
import { getEnglishAssessments } from '@/backend/db'

export const dynamic = 'force-dynamic'

// GET — past assessments, newest first (the first one is the one the match
// analysis and resume use).
export async function GET() {
  try {
    return NextResponse.json(await getEnglishAssessments())
  } catch (e) {
    return NextResponse.json({ error: 'failed to load' }, { status: 500 })
  }
}
