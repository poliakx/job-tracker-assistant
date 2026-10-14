// Database access for generated resumes. vacancyId null = the base resume.
// Postgres allows many NULLs in a unique column, so the base resume is
// found/updated by hand rather than upserted.
import { Prisma } from '@prisma/client'
import prisma from '@/backend/shared/db/prisma'
import type { ResumeContent } from '@/types'

export async function getResume(vacancyId: string | null) {
  return await prisma.resume.findFirst({ where: { vacancyId }, orderBy: { updatedAt: 'desc' } })
}

export async function saveResume(vacancyId: string | null, content: ResumeContent, changes: string[]) {
  const data = { content: content as unknown as Prisma.InputJsonValue, changes: changes as Prisma.InputJsonValue }
  if (vacancyId) {
    return await prisma.resume.upsert({ where: { vacancyId }, create: { vacancyId, ...data }, update: data })
  }
  const existing = await getResume(null)
  if (existing) return await prisma.resume.update({ where: { id: existing.id }, data })
  return await prisma.resume.create({ data })
}
