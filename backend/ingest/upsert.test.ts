import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RawVacancy } from '../sources/types'

const { createVacancy } = vi.hoisted(() => ({ createVacancy: vi.fn() }))
vi.mock('../db', () => ({ createVacancy }))

// Imported after the mock so upsert.ts picks up the mocked createVacancy.
const { upsertVacancies } = await import('./upsert')

function rawVacancy(overrides: Partial<RawVacancy> = {}): RawVacancy {
  return {
    source: 'example',
    externalId: 'ext-1',
    url: 'https://jobs.example.com/offers/ext-1',
    title: 'Junior Backend Developer',
    company: 'Acme',
    location: 'Warszawa',
    remote: false,
    description: 'Build APIs.',
    postedAt: new Date('2026-09-20T00:00:00.000Z'),
    ...overrides,
  }
}

function duplicateError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`source`,`externalId`)', {
    code: 'P2002',
    clientVersion: '5.22.0',
  })
}

describe('upsertVacancies', () => {
  beforeEach(() => {
    createVacancy.mockReset()
  })

  it('inserts every vacancy when none exist yet', async () => {
    createVacancy.mockImplementation(async data => ({ id: 'row-1', ...data }))

    const inserted = await upsertVacancies([rawVacancy({ externalId: 'a' }), rawVacancy({ externalId: 'b' })])

    expect(inserted).toHaveLength(2)
    expect(createVacancy).toHaveBeenCalledTimes(2)
  })

  it('skips a vacancy that already exists (unique constraint) instead of throwing', async () => {
    createVacancy
      .mockImplementationOnce(async data => ({ id: 'row-1', ...data }))
      .mockImplementationOnce(async () => {
        throw duplicateError()
      })

    const inserted = await upsertVacancies([rawVacancy({ externalId: 'dup' }), rawVacancy({ externalId: 'dup' })])

    expect(inserted).toHaveLength(1)
    expect(createVacancy).toHaveBeenCalledTimes(2)
  })

  it('lets an unrelated database error propagate', async () => {
    createVacancy.mockImplementationOnce(async () => {
      throw new Error('connection refused')
    })

    await expect(upsertVacancies([rawVacancy()])).rejects.toThrow('connection refused')
  })
})
