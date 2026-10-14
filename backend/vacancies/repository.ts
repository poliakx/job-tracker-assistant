// Database access for vacancies — found by the pipeline or pasted in by the
// owner. Ranked by fit score once analyzed.
import { ApplicationSource, Prisma } from '@prisma/client'
import prisma from '@/backend/shared/db/prisma'
import { getActiveProfile } from '@/backend/profile/repository'
import type { Vacancy, VacancyStatus } from '@/types'
import { buildPromotionNotes } from './promotionNotes'

// Every column except `description` — the full posting text is most of a
// vacancy's size and the list never shows it (GET /api/vacancies/:id does).
const VACANCY_SUMMARY_SELECT = Object.fromEntries(
  Object.values(Prisma.VacancyScalarFieldEnum)
    .filter(field => field !== 'description')
    .map(field => [field, true])
) as Record<Exclude<Prisma.VacancyScalarFieldEnum, 'description'>, true>

// `manual`: true = only vacancies pasted in by hand, false = only ones the
// sources found, undefined = both.
export async function getVacancies(filter: { status?: VacancyStatus; minScore?: number; manual?: boolean } = {}) {
  return await prisma.vacancy.findMany({
    select: VACANCY_SUMMARY_SELECT,
    where: {
      ...(filter.status !== undefined ? { status: filter.status } : {}),
      ...(filter.minScore !== undefined ? { fitScore: { gte: filter.minScore } } : {}),
      ...(filter.manual !== undefined ? { source: filter.manual ? 'manual' : { not: 'manual' } } : {}),
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
// Pasted-in vacancies (source "manual") are left out: the owner analyzes
// those on purpose from /vacancies/check, and the automatic filter/triage
// must not dismiss one behind their back.
export async function getVacanciesPendingFilter(limit?: number) {
  return await prisma.vacancy.findMany({
    where: { filterReasons: { equals: Prisma.DbNull }, source: { not: 'manual' } },
    ...(limit !== undefined ? { take: limit } : {}),
  })
}

// Vacancies eligible for LLM analysis: the cheap filter didn't dismiss them,
// and `analysis` is still genuinely SQL NULL (Prisma.DbNull) — meaning
// no analysis attempt (triage or deep) has recorded a result yet. A
// triage that decided "not worth a deep look" still writes to `analysis`
// (see scripts/analyze-once.ts), so it isn't picked up again forever.
// Oldest-touched first: a failed attempt bumps updatedAt (see
// deferVacancyAnalysis), so a vacancy that keeps failing goes to the back
// of the queue instead of blocking every batch.
export async function getVacanciesPendingAnalysis(limit: number) {
  return await prisma.vacancy.findMany({
    where: { status: { not: 'DISMISSED' }, analysis: { equals: Prisma.DbNull }, source: { not: 'manual' } },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  })
}

// After a failed analysis attempt: move the vacancy to the back of the
// pending queue (see getVacanciesPendingAnalysis).
export async function deferVacancyAnalysis(id: string) {
  await prisma.vacancy.update({ where: { id }, data: { updatedAt: new Date() } })
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
    },
  })
  const claimed = result.count > 0
  // The status only moves if the owner hasn't already decided on the
  // vacancy (shortlisted it while it waited in the queue, say).
  if (claimed && data.status !== undefined) {
    await prisma.vacancy.updateMany({ where: { id, status: 'NEW' }, data: { status: data.status } })
  }
  return claimed
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
// the other repository functions.
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
