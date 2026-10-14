import { NextRequest, NextResponse } from 'next/server'
import { interviewStep } from '@/backend/profile/interview/interview'
import { getLatestEnglishResult } from '@/backend/english/repository'
import { getSavedProfile } from '@/backend/profile/repository'
import type { LlmMessage } from '@/backend/shared/llm/callTool'

export const dynamic = 'force-dynamic'

// POST { messages: {role, content}[], mode?: 'new' | 'update' } — the
// conversation so far (empty array to start). 'update' runs a follow-up
// interview against the saved profile (falls back to a new one if nothing
// is saved yet). Returns the interviewer's next message and whether it has
// gathered enough to extract a profile.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const messages: LlmMessage[] = Array.isArray(body?.messages) ? body.messages : []
    const existing = body?.mode === 'update' ? (await getSavedProfile()) ?? undefined : undefined

    // A follow-up interview also gets the latest English test result, so it
    // can point out when it disagrees with the level in the profile.
    const outcome = existing
      ? await interviewStep(messages, existing, await getLatestEnglishResult())
      : await interviewStep(messages, existing)
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: 502 })
    }
    return NextResponse.json({ message: outcome.result.message, done: outcome.result.done })
  } catch (e) {
    return NextResponse.json({ error: 'failed to run interview step' }, { status: 500 })
  }
}
