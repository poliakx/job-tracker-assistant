import { NextRequest, NextResponse } from 'next/server'
import { getActiveProfile } from '@/backend/profile/repository'
import { getLatestEnglishResult } from '@/backend/english/repository'
import { getVacancyById, updateVacancy } from '@/backend/vacancies/repository'
import { analyzeVacancyDeep } from '@/backend/vacancies/analysis/analyze'

export const dynamic = 'force-dynamic'

// POST /api/vacancies/:id/analyze — run (or re-run) the deep match analysis
// on one vacancy against the current profile and latest English result.
// Skips triage: the owner picked this vacancy on purpose, so it always gets
// the full read. Overwrites any earlier analysis — re-running after a
// profile update is the point.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const vacancy = await getVacancyById(params.id)
    if (!vacancy) return NextResponse.json({ error: 'vacancy not found' }, { status: 404 })

    const [profile, english] = await Promise.all([getActiveProfile(), getLatestEnglishResult()])
    const outcome = await analyzeVacancyDeep(vacancy, profile, english)
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 502 })

    const updated = await updateVacancy(vacancy.id, {
      fitScore: Math.round(outcome.result.fitScore),
      suggestedResume: outcome.result.suggestedResume,
      analysis: outcome.result,
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: 'failed to analyze' }, { status: 500 })
  }
}
