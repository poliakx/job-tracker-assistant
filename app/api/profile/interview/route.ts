import { NextRequest, NextResponse } from 'next/server'
import { interviewStep } from '@/backend/llm/interview'
import type { LlmMessage } from '@/backend/llm/llmTool'

export const dynamic = 'force-dynamic'

// POST { messages: {role, content}[] } — the conversation so far (empty
// array to start). Returns the interviewer's next message and whether it
// has gathered enough to extract a profile.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const messages: LlmMessage[] = Array.isArray(body?.messages) ? body.messages : []

    const outcome = await interviewStep(messages)
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: 502 })
    }
    return NextResponse.json({ message: outcome.result.message, done: outcome.result.done })
  } catch (e) {
    return NextResponse.json({ error: 'failed to run interview step' }, { status: 500 })
  }
}
