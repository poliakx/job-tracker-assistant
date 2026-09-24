import { describe, expect, it, vi } from 'vitest'
import { enabledSources } from './index'
import type { VacancySource } from './types'

// The registry imports the real adapters, which import the database.
vi.mock('@/backend/db', () => ({}))

const make = (name: string): VacancySource => ({ name, label: name, fetchRecent: async () => [] })

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
