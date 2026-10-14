import { ApplicationSource, Prisma, SourceKind } from '@prisma/client'
import prisma from './prisma'
import { candidateProfile, CandidateProfileSchema } from '../profile'
import { buildPromotionNotes } from '../helpers/promotionNotes'
import { EnglishAssessmentResultSchema } from '../english'
import type {
  CandidateProfile,
  EnglishAssessmentResult,
  JobApplication,
  PipelineRun,
  QuizScore,
  ResumeContent,
  Vacancy,
  VacancyStatus,
} from '@/types'

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

// --- Vacancy -----------------------------------------------------------
// A vacancy found by the ingestion pipeline. Ranked by fit score once analyzed.

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

// For the daily analysis cost cap: how many vacancies pipeline runs started
// since `date` have deep-analyzed. Counted from PipelineRun rows rather than
// Vacancy.updatedAt, which every status change (shortlist, dismiss) bumps.
export async function countAnalyzedSince(date: Date) {
  const result = await prisma.pipelineRun.aggregate({ _sum: { analyzed: true }, where: { startedAt: { gte: date } } })
  return result._sum.analyzed ?? 0
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

// --- Resume ----------------------------------------------------------------
// vacancyId null = the base resume. Postgres allows many NULLs in a unique
// column, so the base resume is found/updated by hand rather than upserted.

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

// --- EnglishAssessment -------------------------------------------------------

export async function getLatestEnglishAssessment() {
  return await prisma.englishAssessment.findFirst({ orderBy: { createdAt: 'desc' } })
}

// The latest assessment's result, validated — for prompts that need it.
// null if there's no assessment yet (or it's somehow malformed).
export async function getLatestEnglishResult(): Promise<EnglishAssessmentResult | null> {
  const row = await getLatestEnglishAssessment()
  if (!row) return null
  const parsed = EnglishAssessmentResultSchema.safeParse(row.result)
  return parsed.success ? parsed.data : null
}

export async function getEnglishAssessments(limit = 10) {
  return await prisma.englishAssessment.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
}

export async function createEnglishAssessment(result: EnglishAssessmentResult, quizScore: QuizScore) {
  return await prisma.englishAssessment.create({
    data: {
      overallLevel: result.overall,
      result: result as unknown as Prisma.InputJsonValue,
      quizScore: quizScore as unknown as Prisma.InputJsonValue,
    },
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

// --- SourceConfig ----------------------------------------------------------
// Job sources added from /sources. backend/sources/index.ts turns the
// enabled ones into VacancySources next to the code adapters.

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
