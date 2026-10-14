import { NextResponse } from 'next/server'
import { generateEnglishTest } from '@/backend/english/llm'

export const dynamic = 'force-dynamic'

// POST — generate a fresh placement test. The answer key is included: this
// is a self-assessment for the owner, and the page only reveals it after
// the quiz is submitted. Scoring happens server-side in /evaluate anyway.
export async function POST() {
  try {
    const outcome = await generateEnglishTest()
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 502 })
    return NextResponse.json(outcome.result)
  } catch (e) {
    return NextResponse.json({ error: 'failed to generate test' }, { status: 500 })
  }
}
