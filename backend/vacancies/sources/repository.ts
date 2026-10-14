// Database access for job sources added from /sources. ./index.ts turns
// the enabled ones into VacancySources next to the code adapters.
import { SourceKind } from '@prisma/client'
import prisma from '@/backend/shared/db/prisma'

export async function getSourceConfigs() {
  return await prisma.sourceConfig.findMany({ orderBy: { createdAt: 'asc' } })
}

export async function getEnabledSourceConfigs() {
  return await prisma.sourceConfig.findMany({ where: { enabled: true }, orderBy: { createdAt: 'asc' } })
}

export async function findSourceConfig(kind: SourceKind, identifier: string) {
  return await prisma.sourceConfig.findUnique({ where: { kind_identifier: { kind, identifier } } })
}

export async function createSourceConfig(data: { kind: SourceKind; identifier: string; label: string; termsUrl: string; termsNote: string }) {
  return await prisma.sourceConfig.create({ data: { ...data, termsConfirmedAt: new Date() } })
}

export async function setSourceConfigEnabled(id: string, enabled: boolean) {
  return await prisma.sourceConfig.update({ where: { id }, data: { enabled } })
}

// Vacancies already ingested from the source stay: they're the owner's data
// now, and may have been shortlisted or applied to.
export async function deleteSourceConfig(id: string) {
  return await prisma.sourceConfig.delete({ where: { id } })
}
