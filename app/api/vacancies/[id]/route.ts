import { NextRequest, NextResponse } from 'next/server'
import { getVacancyById } from '@/backend/db'

// GET /api/vacancies/:id — one vacancy in full, including the posting text
// the list endpoint leaves out.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const vacancy = await getVacancyById(params.id)
    if (!vacancy) return NextResponse.json({ error: 'vacancy not found' }, { status: 404 })
    return NextResponse.json(vacancy)
  } catch (e) {
    return NextResponse.json({ error: 'failed to load' }, { status: 500 })
  }
}
