import { NextRequest, NextResponse } from 'next/server'
import { getSavedProfile, saveProfile } from '@/backend/profile/repository'
import { CandidateProfileSchema } from '@/backend/profile/schema'

// Reading/writing the live profile itself never hits the LLM — that only
// happens in /api/profile/interview(/extract). This route just persists
// whatever the review screen (or the contact form) ends up submitting.
export const dynamic = 'force-dynamic'

// { profile: CandidateProfile | null } — null until the owner has saved
// one (the seed profile backend/profile/repository.ts falls back to is not returned here).
export async function GET() {
  try {
    const profile = await getSavedProfile()
    return NextResponse.json({ profile })
  } catch (e) {
    return NextResponse.json({ error: 'failed to load' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = CandidateProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid profile', details: parsed.error.message }, { status: 400 })
    }
    await saveProfile(parsed.data)
    return NextResponse.json(parsed.data)
  } catch (e) {
    return NextResponse.json({ error: 'failed to save' }, { status: 500 })
  }
}
