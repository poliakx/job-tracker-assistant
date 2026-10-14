// Database access for job applications (the ones the owner applied to).
import { Prisma } from '@prisma/client'
import prisma from '@/backend/shared/db/prisma'
import type { JobApplication } from '@/types'

export async function getApplications() {
  return await prisma.jobApplication.findMany({ orderBy: { appliedDate: 'desc' } })
}

export async function createApplication(data: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>) {
  return await prisma.jobApplication.create({
    data: {
      company: data.company,
      position: data.position,
      jobUrl: data.jobUrl ?? null,
      status: data.status,
      source: data.source,
      appliedDate: new Date(data.appliedDate),
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      contactPerson: data.contactPerson ?? null,
      notes: data.notes ?? null,
    },
  })
}

// Only the editable fields — id, timestamps and the vacancy link are never
// taken from the patch. An empty optional field clears it.
export async function updateApplication(id: string, patch: Partial<JobApplication>) {
  const data: Prisma.JobApplicationUpdateInput = {}
  if (patch.company !== undefined) data.company = patch.company
  if (patch.position !== undefined) data.position = patch.position
  if (patch.jobUrl !== undefined) data.jobUrl = patch.jobUrl || null
  if (patch.status !== undefined) data.status = patch.status
  if (patch.source !== undefined) data.source = patch.source
  if (patch.appliedDate !== undefined) data.appliedDate = new Date(patch.appliedDate)
  if (patch.followUpDate !== undefined) data.followUpDate = patch.followUpDate ? new Date(patch.followUpDate) : null
  if (patch.contactPerson !== undefined) data.contactPerson = patch.contactPerson || null
  if (patch.notes !== undefined) data.notes = patch.notes || null
  return await prisma.jobApplication.update({ where: { id }, data })
}

export async function deleteApplication(id: string) {
  // If this application was promoted from a Vacancy (Phase 7), the FK's
  // SetNull default only clears applicationId — it would leave the vacancy
  // stuck showing status APPLIED with nothing actually applied to. Reset it
  // to SHORTLISTED (not NEW: the owner cared enough to shortlist+promote it)
  // in the same transaction.
  return await prisma.$transaction(async tx => {
    const vacancy = await tx.vacancy.findUnique({ where: { applicationId: id } })
    if (vacancy) {
      await tx.vacancy.update({ where: { id: vacancy.id }, data: { status: 'SHORTLISTED', applicationId: null } })
    }
    return await tx.jobApplication.delete({ where: { id } })
  })
}
