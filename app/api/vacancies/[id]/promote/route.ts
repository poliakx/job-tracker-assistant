import { NextRequest, NextResponse } from 'next/server'
import { promoteVacancyToApplication } from '@/backend/vacancies/repository'

// POST /api/vacancies/:id/promote — creates a JobApplication from the
// vacancy and links them. Idempotent: calling it again on an already-
// promoted vacancy returns the existing application instead of a new one.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await promoteVacancyToApplication(params.id)
    if (!result.ok) {
      return NextResponse.json({ error: 'vacancy not found' }, { status: 404 })
    }
    return NextResponse.json({ application: result.application, alreadyPromoted: result.alreadyPromoted })
  } catch (e) {
    return NextResponse.json({ error: 'failed to promote' }, { status: 500 })
  }
}
