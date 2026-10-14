// Database access for the candidate profile. Singleton row: exactly one
// live profile. The seed in ./seed.ts is the fallback, used until this row
// exists (or again if it's ever malformed — see CandidateProfileSchema).
import { Prisma } from '@prisma/client'
import prisma from '@/backend/shared/db/prisma'
import { candidateProfile } from './seed'
import { CandidateProfileSchema } from './schema'
import type { CandidateProfile } from '@/types'

const PROFILE_ID = 'default'

export async function getActiveProfile(): Promise<CandidateProfile> {
  const row = await prisma.profile.findUnique({ where: { id: PROFILE_ID } })
  if (!row) return candidateProfile

  const parsed = CandidateProfileSchema.safeParse(row.data)
  if (!parsed.success) {
    console.error('Profile row failed validation, falling back to the seed profile:', parsed.error.message)
    return candidateProfile
  }
  return parsed.data
}

// Unlike getActiveProfile, no seed fallback: null means the owner hasn't
// saved a profile yet (so /profile starts a fresh interview instead of
// offering to "update" the illustrative seed).
export async function getSavedProfile(): Promise<CandidateProfile | null> {
  const row = await prisma.profile.findUnique({ where: { id: PROFILE_ID } })
  if (!row) return null
  const parsed = CandidateProfileSchema.safeParse(row.data)
  return parsed.success ? parsed.data : null
}

export async function saveProfile(profile: CandidateProfile) {
  const data = profile as unknown as Prisma.InputJsonValue
  return await prisma.profile.upsert({
    where: { id: PROFILE_ID },
    create: { id: PROFILE_ID, data },
    update: { data },
  })
}
