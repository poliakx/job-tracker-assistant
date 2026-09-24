import { NextRequest, NextResponse } from 'next/server'
import { getVacancies, updateVacancy } from '@/backend/db'
import type { VacancyStatus } from '@/types'

const VALID_STATUSES: VacancyStatus[] = ['NEW', 'SHORTLISTED', 'DISMISSED', 'APPLIED']

// GET /api/vacancies?status=NEW&minScore=50 — sorted by fitScore desc
// (unscored vacancies last), both filters optional.
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

    const vacancies = await getVacancies({ status: (statusParam as VacancyStatus) ?? undefined, minScore })
    return NextResponse.json(vacancies)
  } catch (e) {
    return NextResponse.json({ error: 'failed to load' }, { status: 500 })
  }
}

// PATCH { id, status } — e.g. Shortlist / Dismiss from the inbox UI (Phase 8).
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...patch } = body
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    const updated = await updateVacancy(id, patch)
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: 'failed to update' }, { status: 500 })
  }
}
