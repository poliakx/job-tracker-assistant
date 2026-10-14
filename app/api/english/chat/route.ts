import { NextRequest, NextResponse } from 'next/server'
import { englishConversationStep } from '@/backend/english/llm'
import type { LlmMessage } from '@/backend/shared/llm/callTool'

export const dynamic = 'force-dynamic'

// POST { messages } — the chat part of the English test so far (empty to
// start). Returns the recruiter's next message and whether the chat is over.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const messages: LlmMessage[] = Array.isArray(body?.messages) ? body.messages : []
    const outcome = await englishConversationStep(messages)
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 502 })
    return NextResponse.json({ message: outcome.result.message, done: outcome.result.done })
  } catch (e) {
    return NextResponse.json({ error: 'failed to run chat step' }, { status: 500 })
  }
}
