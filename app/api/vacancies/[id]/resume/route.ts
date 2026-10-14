import { NextRequest, NextResponse } from 'next/server'
import { generateResumeView, getResumeView } from '@/backend/resume/service'

export const dynamic = 'force-dynamic'

// GET — the resume tailored to this vacancy (resume: null if none yet).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await getResumeView(params.id)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.view)
  } catch (e) {
    return NextResponse.json({ error: 'failed to load' }, { status: 500 })
  }
}

// POST — (re)generate the resume tailored to this vacancy.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await generateResumeView(params.id)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.view)
  } catch (e) {
    return NextResponse.json({ error: 'failed to generate resume' }, { status: 500 })
  }
}
