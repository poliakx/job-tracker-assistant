import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VacancySource } from './types'

const getEnabledSourceConfigs = vi.fn()
const getSourceConfigs = vi.fn()

// The registry imports the real adapters, which import the database.
vi.mock('./repository', () => ({ getEnabledSourceConfigs, getSourceConfigs }))

const { allSources, enabledSources, getSources, listSourceInfo } = await import('@/backend/vacancies/sources')

const legal = { access: 'official-api' as const, termsUrl: 'https://example.com/terms', termsNote: 'test', reviewedAt: '2026-01-01' }
const make = (name: string): VacancySource => ({ name, label: name, legal, fetchRecent: async () => [] })

const configRow = {
  id: 'cfg1',
  kind: 'greenhouse' as const,
  identifier: 'acme',
  label: 'Acme',
  enabled: true,
  termsUrl: 'https://developers.greenhouse.io/job-board.html',
  termsNote: 'Public job board API.',
  termsConfirmedAt: new Date('2026-09-30T10:00:00Z'),
}

describe('enabledSources', () => {
  const all = [make('a'), make('b'), make('c')]

  it('returns every source when nothing is disabled', () => {
    expect(enabledSources(all, undefined)).toEqual(all)
    expect(enabledSources(all, '')).toEqual(all)
  })

  it('drops the sources named in the comma-separated list', () => {
    expect(enabledSources(all, ' a , c ').map(s => s.name)).toEqual(['b'])
  })
})

describe('every code adapter', () => {
  it('records its legal basis', () => {
    for (const source of allSources) {
      expect(source.legal.termsUrl).toMatch(/^https?:\/\//)
      expect(source.legal.termsNote.trim()).not.toBe('')
      expect(source.legal.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('getSources', () => {
  afterEach(() => {
    delete process.env.DISABLED_SOURCES
  })

  it('adds enabled UI-configured sources after the code adapters', async () => {
    getEnabledSourceConfigs.mockResolvedValue([configRow])
    const names = (await getSources()).map(s => s.name)
    expect(names).toEqual([...allSources.map(s => s.name), 'greenhouse:cfg1'])
  })

  it('applies DISABLED_SOURCES to configured sources too', async () => {
    getEnabledSourceConfigs.mockResolvedValue([configRow])
    process.env.DISABLED_SOURCES = 'greenhouse:cfg1'
    expect((await getSources()).map(s => s.name)).not.toContain('greenhouse:cfg1')
  })
})

describe('listSourceInfo', () => {
  it('lists configured sources with their recorded legal basis, including switched-off ones', async () => {
    getSourceConfigs.mockResolvedValue([{ ...configRow, enabled: false }])
    const info = (await listSourceInfo()).find(s => s.id === 'cfg1')
    expect(info).toEqual({
      id: 'cfg1',
      name: 'greenhouse:cfg1',
      label: 'Acme',
      kind: 'greenhouse',
      identifier: 'acme',
      enabled: false,
      disabledByEnv: false,
      legal: {
        access: 'official-api',
        termsUrl: 'https://developers.greenhouse.io/job-board.html',
        termsNote: 'Public job board API.',
        reviewedAt: '2026-09-30',
      },
    })
  })
})
