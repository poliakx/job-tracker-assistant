import { NextResponse } from 'next/server'
import { generateResumeView, getResumeView } from '@/backend/resumeService'

export const dynamic = 'force-dynamic'

// GET — the base resume (resume: null if none generated yet) plus the
// contact details to render it with.
export async function GET() {
  try {
    const result = await getResumeView(null)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.view)
  } catch (e) {
    return NextResponse.json({ error: 'failed to load' }, { status: 500 })
  }
}

// POST — (re)generate the base resume from the current profile.
export async function POST() {
  try {
    const result = await generateResumeView(null)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.view)
  } catch (e) {
    return NextResponse.json({ error: 'failed to generate resume' }, { status: 500 })
  }
}
