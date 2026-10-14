import { NextRequest, NextResponse } from 'next/server'
import { extractProfile } from '@/backend/profile/interview/interview'
import { getSavedProfile } from '@/backend/profile/repository'
import type { LlmMessage } from '@/backend/shared/llm/callTool'

export const dynamic = 'force-dynamic'

// POST { messages: {role, content}[], mode?: 'new' | 'update' } — the full
// interview transcript. 'update' merges it into the saved profile. Returns
// the extracted profile for the owner to review; does NOT save it (PUT
// /api/profile does that, after review). Contact details entered on
// /profile are carried over either way — the interview never touches them.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const messages: LlmMessage[] = Array.isArray(body?.messages) ? body.messages : []
    if (messages.length === 0) {
      return NextResponse.json({ error: 'empty transcript' }, { status: 400 })
    }

    const saved = await getSavedProfile()
    const outcome = await extractProfile(messages, body?.mode === 'update' ? saved ?? undefined : undefined)
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: 502 })
    }
    return NextResponse.json(saved ? { ...outcome.result, contact: saved.contact } : outcome.result)
  } catch (e) {
    return NextResponse.json({ error: 'failed to extract profile' }, { status: 500 })
  }
}
