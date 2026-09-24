import { ApplicationSource, Prisma } from '@prisma/client'
import prisma from './prisma'
import { candidateProfile, CandidateProfileSchema } from '../profile'
import { buildPromotionNotes } from '../helpers/promotionNotes'
import type { CandidateProfile, JobApplication, PipelineRun, Vacancy, VacancyStatus } from '@/types'

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

export async function updateApplication(id: string, patch: Partial<JobApplication>) {
  const data: any = { ...patch }
  if (patch.appliedDate) data.appliedDate = new Date(patch.appliedDate)
  if (patch.followUpDate) data.followUpDate = new Date(patch.followUpDate as string)
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

// --- Vacancy -----------------------------------------------------------
// A vacancy found by the ingestion pipeline. Ranked by fit score once analyzed.

export async function getVacancies(filter: { status?: VacancyStatus; minScore?: number } = {}) {
  return await prisma.vacancy.findMany({
    where: {
      ...(filter.status !== undefined ? { status: filter.status } : {}),
      ...(filter.minScore !== undefined ? { fitScore: { gte: filter.minScore } } : {}),
    },
    orderBy: [{ fitScore: 'desc' }, { fetchedAt: 'desc' }],
  })
}

export async function getVacancyById(id: string) {
  return await prisma.vacancy.findUnique({ where: { id } })
}

export async function createVacancy(
  data: Omit<
    Vacancy,
    'id' | 'fetchedAt' | 'status' | 'fitScore' | 'analysis' | 'suggestedResume' | 'filterReasons' | 'applicationId' | 'createdAt' | 'updatedAt'
  >
) {
  return await prisma.vacancy.create({
    data: {
      source: data.source,
      externalId: data.externalId,
      url: data.url,
      title: data.title,
      company: data.company,
      location: data.location ?? null,
      remote: data.remote ?? null,
      description: data.description,
      postedAt: data.postedAt ? new Date(data.postedAt) : null,
    },
  })
}

export async function updateVacancy(id: string, patch: Partial<Vacancy>) {
  // Unchecked variant: lets us set the applicationId foreign key directly
  // instead of going through a relation `connect`/`disconnect`.
  const data: Prisma.VacancyUncheckedUpdateInput = {}
  if (patch.status !== undefined) data.status = patch.status
  if (patch.fitScore !== undefined) data.fitScore = patch.fitScore
  if (patch.analysis !== undefined) data.analysis = patch.analysis as Prisma.InputJsonValue
  if (patch.suggestedResume !== undefined) data.suggestedResume = patch.suggestedResume
  if (patch.filterReasons !== undefined) data.filterReasons = patch.filterReasons as Prisma.InputJsonValue
  if (patch.applicationId !== undefined) data.applicationId = patch.applicationId ?? null
  if (patch.location !== undefined) data.location = patch.location
  if (patch.remote !== undefined) data.remote = patch.remote
  if (patch.description !== undefined) data.description = patch.description
  if (patch.postedAt !== undefined) data.postedAt = patch.postedAt ? new Date(patch.postedAt) : null
  return await prisma.vacancy.update({ where: { id }, data })
}

export async function deleteVacancy(id: string) {
  return await prisma.vacancy.delete({ where: { id } })
}

// Used by source adapters to skip re-fetching a vacancy's detail page
// (an extra request per vacancy) once it's already been ingested.
export async function hasVacancy(source: string, externalId: string) {
  const count = await prisma.vacancy.count({ where: { source, externalId } })
  return count > 0
}

// Vacancies backend/filter.ts hasn't run on yet: filterReasons is genuinely
// SQL NULL (Prisma.DbNull), not the JSON value `null` — see the field's
// comment in schema.prisma. `limit` bounds one batch (Phase 6: a scheduled
// endpoint has to finish inside a serverless time limit).
export async function getVacanciesPendingFilter(limit?: number) {
  return await prisma.vacancy.findMany({
    where: { filterReasons: { equals: Prisma.DbNull } },
    ...(limit !== undefined ? { take: limit } : {}),
  })
}

// Vacancies eligible for LLM analysis: the cheap filter didn't dismiss them,
// and `analysis` is still genuinely SQL NULL (Prisma.DbNull) — meaning
// no analysis attempt (triage or deep) has recorded a result yet. A
// triage that decided "not worth a deep look" still writes to `analysis`
// (see scripts/analyze-once.ts), so it isn't picked up again forever.
export async function getVacanciesPendingAnalysis(limit: number) {
  return await prisma.vacancy.findMany({
    where: { status: { not: 'DISMISSED' }, analysis: { equals: Prisma.DbNull } },
    orderBy: { fetchedAt: 'asc' },
    take: limit,
  })
}

// For the daily analysis cost cap: how many vacancies got a fitScore today.
export async function countAnalyzedSince(date: Date) {
  return await prisma.vacancy.count({ where: { fitScore: { not: null }, updatedAt: { gte: date } } })
}

// Optimistic-concurrency write: only succeeds if this vacancy's `analysis`
// is still genuinely SQL NULL, i.e. nothing else has recorded a result
// since it was selected. Used by backend/pipeline.ts's analyze stage so two
// overlapping pipeline runs can't both spend an LLM call re-analyzing (and
// then overwriting) the same vacancy. Returns false if the row was already
// claimed — the caller should treat that as "someone else handled it",
// not as an error.
export async function claimVacancyAnalysis(
  id: string,
  data: { fitScore?: number; suggestedResume?: Vacancy['suggestedResume']; status?: VacancyStatus; analysis: Prisma.InputJsonValue }
): Promise<boolean> {
  const result = await prisma.vacancy.updateMany({
    where: { id, analysis: { equals: Prisma.DbNull } },
    data: {
      analysis: data.analysis,
      ...(data.fitScore !== undefined ? { fitScore: data.fitScore } : {}),
      ...(data.suggestedResume !== undefined ? { suggestedResume: data.suggestedResume } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  })
  return result.count > 0
}

// A vacancy's source name becomes the application's source when it's one of
// the ApplicationSource values; anything else is recorded as "other".
function toApplicationSource(vacancySource: string): ApplicationSource {
  return (Object.values(ApplicationSource) as string[]).includes(vacancySource)
    ? (vacancySource as ApplicationSource)
    : ApplicationSource.other
}

// Creates a JobApplication from a Vacancy (prefilling company/position/url
// and, in notes, the suggested resume) and links the two, all in one
// transaction. Idempotent: if the vacancy was already promoted
// (applicationId set), returns the existing application instead of
// creating a second one. Return type is inferred from Prisma, matching
// every other function in this file — see createApplication.
export async function promoteVacancyToApplication(vacancyId: string) {
  const profile = await getActiveProfile()
  return await prisma.$transaction(async tx => {
    const vacancy = await tx.vacancy.findUnique({ where: { id: vacancyId } })
    if (!vacancy) return { ok: false as const, reason: 'not_found' as const }

    if (vacancy.applicationId) {
      const application = await tx.jobApplication.findUniqueOrThrow({ where: { id: vacancy.applicationId } })
      return { ok: true as const, application, alreadyPromoted: true }
    }

    const application = await tx.jobApplication.create({
      data: {
        company: vacancy.company,
        position: vacancy.title,
        jobUrl: vacancy.url,
        status: 'applied',
        source: toApplicationSource(vacancy.source),
        appliedDate: new Date(),
        notes: buildPromotionNotes(vacancy, profile),
      },
    })

    await tx.vacancy.update({
      where: { id: vacancy.id },
      data: { applicationId: application.id, status: 'APPLIED' },
    })

    return { ok: true as const, application, alreadyPromoted: false }
  })
}

// --- Profile (Phase 9) ---------------------------------------------------
// Singleton row: exactly one live candidate profile. backend/profile.ts's
// hardcoded object is the seed/fallback, used until this row exists (or
// again if it's ever malformed — see CandidateProfileSchema).

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

export async function saveProfile(profile: CandidateProfile) {
  const data = profile as unknown as Prisma.InputJsonValue
  return await prisma.profile.upsert({
    where: { id: PROFILE_ID },
    create: { id: PROFILE_ID, data },
    update: { data },
  })
}

// --- PipelineRun ---------------------------------------------------------
// One execution of the ingest → filter → analyze pipeline, for observability.

export async function createPipelineRun(source: string) {
  return await prisma.pipelineRun.create({ data: { source } })
}

export async function finishPipelineRun(
  id: string,
  data: Pick<PipelineRun, 'fetched' | 'newCount' | 'analyzed'> & {
    errors?: Prisma.InputJsonValue
    tokenUsage?: Prisma.InputJsonValue
  }
) {
  return await prisma.pipelineRun.update({
    where: { id },
    data: {
      finishedAt: new Date(),
      fetched: data.fetched,
      newCount: data.newCount,
      analyzed: data.analyzed,
      ...(data.errors !== undefined ? { errors: data.errors } : {}),
      ...(data.tokenUsage !== undefined ? { tokenUsage: data.tokenUsage } : {}),
    },
  })
}

export async function getLatestPipelineRun() {
  return await prisma.pipelineRun.findFirst({ orderBy: { startedAt: 'desc' } })
}
