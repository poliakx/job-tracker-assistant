import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createVacancy, getVacancies, updateVacancy } from '@/backend/vacancies/repository'
import { extractVacancyDetails, type VacancyDetails } from '@/backend/vacancies/details/extract'
import type { VacancyStatus } from '@/types'

const VALID_STATUSES = ['NEW', 'SHORTLISTED', 'DISMISSED', 'APPLIED'] as const satisfies readonly VacancyStatus[]

// A vacancy the owner pasted in by hand, as one block of text. That text is
// what the match is scored against, so it has to be the real posting.
const ManualVacancySchema = z.object({
  text: z.string().trim().min(50, 'paste the full vacancy text (at least 50 characters)').max(30000),
})

// Used when the details call fails — adding the vacancy shouldn't depend on
// it. The first line of a pasted posting is almost always the title.
function fallbackDetails(text: string): VacancyDetails {
  const firstLine = text.split('\n').find(l => l.trim())?.trim() ?? 'Vacancy'
  return { title: firstLine.slice(0, 120), company: '', location: '', remote: null, url: '' }
}

// POST { text } — add a vacancy by pasting the whole posting. Title,
// company etc. are pulled out of the text (source is always "manual").
export async function POST(req: NextRequest) {
  try {
    const parsed = ManualVacancySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid vacancy', details: parsed.error.issues[0]?.message }, { status: 400 })
    }
    const { text } = parsed.data
    const outcome = await extractVacancyDetails(text)
    const details = outcome.ok && outcome.result.title.trim() ? outcome.result : fallbackDetails(text)

    const vacancy = await createVacancy({
      source: 'manual',
      externalId: randomUUID(),
      title: details.title.trim(),
      company: details.company.trim() || 'Unknown company',
      url: details.url.trim(),
      location: details.location.trim() || undefined,
      remote: details.remote ?? undefined,
      description: text,
    })
    return NextResponse.json(vacancy, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'failed to create' }, { status: 500 })
  }
}

// GET /api/vacancies?status=NEW&minScore=50&manual=false — sorted by
// fitScore desc (unscored vacancies last), all filters optional. manual=true
// is only pasted-in vacancies, manual=false only found ones. Items come
// without `description`; GET /api/vacancies/:id has it.
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const statusParam = url.searchParams.get('status')
    if (statusParam && !VALID_STATUSES.includes(statusParam as VacancyStatus)) {
      return NextResponse.json({ error: `invalid status, expected one of ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    const minScoreParam = url.searchParams.get('minScore')
    let minScore: number | undefined
    if (minScoreParam !== null) {
      minScore = Number(minScoreParam)
      if (Number.isNaN(minScore)) {
        return NextResponse.json({ error: 'invalid minScore' }, { status: 400 })
      }
    }

    const manualParam = url.searchParams.get('manual')
    if (manualParam !== null && manualParam !== 'true' && manualParam !== 'false') {
      return NextResponse.json({ error: 'invalid manual, expected true or false' }, { status: 400 })
    }
    const manual = manualParam === null ? undefined : manualParam === 'true'

    const vacancies = await getVacancies({ status: (statusParam as VacancyStatus) ?? undefined, minScore, manual })
    return NextResponse.json(vacancies)
  } catch (e) {
    return NextResponse.json({ error: 'failed to load' }, { status: 500 })
  }
}

// Only the status is the owner's to set here; the score, analysis and the
// application link are written by the analysis and promote endpoints.
const PatchSchema = z.object({
  id: z.string().min(1, 'missing id'),
  status: z.enum(VALID_STATUSES),
})

// PATCH { id, status } — e.g. Shortlist / Dismiss from the inbox UI (Phase 8).
export async function PATCH(req: NextRequest) {
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid request' }, { status: 400 })
  }
  try {
    const updated = await updateVacancy(parsed.data.id, { status: parsed.data.status })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: 'failed to update' }, { status: 500 })
  }
}
