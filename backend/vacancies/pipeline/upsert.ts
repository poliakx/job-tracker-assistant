// Inserts only vacancies not already in the database. Relies on the
// Vacancy.@@unique([source, externalId]) constraint as the source of
// truth for "already seen" — a source adapter's own pre-check (its
// hasVacancy call) is just an optimization to skip extra network calls,
// not something this function trusts blindly.
import { Prisma } from '@prisma/client'
import { createVacancy } from '@/backend/vacancies/repository'
import type { RawVacancy } from '@/backend/vacancies/sources/types'

export async function upsertVacancies(raw: RawVacancy[]) {
  const inserted: Awaited<ReturnType<typeof createVacancy>>[] = []

  for (const vacancy of raw) {
    try {
      const created = await createVacancy({
        source: vacancy.source,
        externalId: vacancy.externalId,
        url: vacancy.url,
        title: vacancy.title,
        company: vacancy.company,
        location: vacancy.location,
        remote: vacancy.remote,
        description: vacancy.description,
        postedAt: vacancy.postedAt ? vacancy.postedAt.toISOString() : undefined,
      })
      inserted.push(created)
    } catch (err) {
      // P2002 = unique constraint violation, i.e. this [source, externalId]
      // was already inserted (by us or a concurrent run) — expected, skip it.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue
      throw err
    }
  }

  return inserted
}
