// Glue between the resume routes, the DB and the LLM: load a resume ready
// to render, or generate and save a new one. vacancyId null = the base
// resume. Server-side only.
import { getActiveProfile } from '@/backend/profile/repository'
import { getLatestEnglishResult } from '@/backend/english/repository'
import { getResume, saveResume } from './repository'
import { getVacancyById } from '@/backend/vacancies/repository'
import { findUnsupportedSkills, ResumeContentSchema } from './content'
import { generateResume } from './generate'
import type { CandidateProfile, Resume, ResumeView } from '@/types'

type ResumeRow = NonNullable<Awaited<ReturnType<typeof getResume>>>

function toResume(row: ResumeRow): Resume | null {
  const content = ResumeContentSchema.safeParse(row.content)
  if (!content.success) return null
  const changes = Array.isArray(row.changes) ? row.changes.filter((c): c is string => typeof c === 'string') : []
  return {
    id: row.id,
    vacancyId: row.vacancyId ?? undefined,
    content: content.data,
    changes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function buildView(resume: Resume | null, profile: CandidateProfile, vacancy: ResumeView['vacancy']): ResumeView {
  return {
    resume,
    contact: profile.contact,
    unsupportedSkills: resume ? findUnsupportedSkills(resume.content, profile) : [],
    vacancy,
  }
}

export type ResumeResult = { ok: true; view: ResumeView } | { ok: false; status: number; error: string }

async function loadVacancy(vacancyId: string | null) {
  if (!vacancyId) return { ok: true as const, vacancy: null }
  const vacancy = await getVacancyById(vacancyId)
  return vacancy ? { ok: true as const, vacancy } : { ok: false as const }
}

export async function getResumeView(vacancyId: string | null): Promise<ResumeResult> {
  const loaded = await loadVacancy(vacancyId)
  if (!loaded.ok) return { ok: false, status: 404, error: 'vacancy not found' }
  const [row, profile] = await Promise.all([getResume(vacancyId), getActiveProfile()])
  const v = loaded.vacancy
  return { ok: true, view: buildView(row ? toResume(row) : null, profile, v && { id: v.id, title: v.title, company: v.company }) }
}

export async function generateResumeView(vacancyId: string | null): Promise<ResumeResult> {
  const loaded = await loadVacancy(vacancyId)
  if (!loaded.ok) return { ok: false, status: 404, error: 'vacancy not found' }
  const [profile, english] = await Promise.all([getActiveProfile(), getLatestEnglishResult()])

  const v = loaded.vacancy
  const outcome = await generateResume(profile, english, v ?? undefined)
  if (!outcome.ok) return { ok: false, status: 502, error: outcome.error }

  const row = await saveResume(vacancyId, outcome.result.resume, outcome.result.changes)
  return { ok: true, view: buildView(toResume(row), profile, v && { id: v.id, title: v.title, company: v.company }) }
}
