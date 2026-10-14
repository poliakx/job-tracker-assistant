import { describe, expect, it } from 'vitest'
import { filterVacancy, type FilterableVacancy } from './filter'
import { candidateProfile } from '@/backend/profile/seed'

function vacancy(overrides: Partial<FilterableVacancy> = {}): FilterableVacancy {
  return {
    title: 'Junior Backend Developer',
    description: 'We use Node.js, Express and PostgreSQL. REST API, Docker.',
    location: 'Warszawa',
    remote: false,
    ...overrides,
  }
}

describe('filterVacancy', () => {
  it('passes a clean match with no flags', () => {
    const result = filterVacancy(vacancy(), candidateProfile)
    expect(result.pass).toBe(true)
    expect(result.reasons).toEqual([])
  })

  it('hard-rejects a Senior title', () => {
    const result = filterVacancy(vacancy({ title: 'Senior Backend Developer' }), candidateProfile)
    expect(result.pass).toBe(false)
    expect(result.reasons).toEqual(['title-level mismatch: contains "senior"'])
  })

  it('hard-rejects regardless of title casing', () => {
    const result = filterVacancy(vacancy({ title: 'LEAD Software Engineer' }), candidateProfile)
    expect(result.pass).toBe(false)
    expect(result.reasons[0]).toContain('lead')
  })

  it('accepts a Junior/Trainee title without flagging it', () => {
    const result = filterVacancy(vacancy({ title: 'Trainee / Junior Developer' }), candidateProfile)
    expect(result.pass).toBe(true)
  })

  it('accepts an unmarked title (no seniority keyword at all)', () => {
    const result = filterVacancy(vacancy({ title: 'Backend Developer' }), candidateProfile)
    expect(result.pass).toBe(true)
  })

  it('matches the Polish spelling of the profile city (Warszawa vs Warsaw)', () => {
    const result = filterVacancy(vacancy({ location: 'Warszawa, Mazowieckie' }), candidateProfile)
    expect(result.reasons.some(r => r.includes('location'))).toBe(false)
  })

  it('flags — but does not reject — a location outside Warsaw that is not remote', () => {
    const result = filterVacancy(vacancy({ location: 'Kraków', remote: false }), candidateProfile)
    expect(result.pass).toBe(true)
    expect(result.reasons.some(r => r.includes('Kraków'))).toBe(true)
  })

  it('accepts a remote vacancy outside Warsaw without flagging location', () => {
    const result = filterVacancy(vacancy({ location: 'Cała Polska', remote: true }), candidateProfile)
    expect(result.reasons.some(r => r.includes('location'))).toBe(false)
  })

  it('flags a vacancy with no stack overlap, but still passes', () => {
    const result = filterVacancy(
      vacancy({ title: 'PHP Developer', description: 'We use PHP, Symfony and MySQL.' }),
      candidateProfile
    )
    expect(result.pass).toBe(true)
    expect(result.reasons.some(r => r.includes('stack'))).toBe(true)
  })

  it('flags a conflicting core stack even when generic shared tools also overlap', () => {
    // Real bug found reviewing the Inbox: a Java role mentioning Docker,
    // Git, PostgreSQL and REST API passed hasStackOverlap with zero flags,
    // because those generic terms are also in the profile's stack.
    const result = filterVacancy(
      vacancy({
        title: 'Programista Java (k/m)',
        description: 'Java, Spring Boot, PostgreSQL, Docker, Git, REST API, CI/CD.',
      }),
      candidateProfile
    )
    expect(result.pass).toBe(true)
    expect(result.reasons.some(r => r.includes('Java'))).toBe(true)
  })

  it('flags Angular specifically as a different frontend framework', () => {
    const result = filterVacancy(
      vacancy({ title: 'Frontend Developer (Angular)', description: 'Angular, TypeScript, RxJS, Git, REST API.' }),
      candidateProfile
    )
    expect(result.reasons.some(r => r.includes('Angular'))).toBe(true)
  })

  it('does not flag a conflicting marker that is not actually present', () => {
    const result = filterVacancy(vacancy(), candidateProfile) // Node.js/Express/PostgreSQL/Docker, no conflicts
    expect(result.reasons.some(r => r.includes('different core stack'))).toBe(false)
  })

  it('flags required experience above the soft limit, but still passes', () => {
    const result = filterVacancy(
      vacancy({ description: 'Requires minimum 5 lata doświadczenia with Node.js and PostgreSQL.' }),
      candidateProfile
    )
    expect(result.pass).toBe(true)
    expect(result.reasons.some(r => r.includes('5 years'))).toBe(true)
  })

  it('does not mistake an unrelated "N years" mention (e.g. company history) for a requirement', () => {
    // Real false positive found while reviewing actual scraped vacancies:
    // "With its strong over 55-year heritage..." is boilerplate about the
    // employer, not an experience requirement.
    const result = filterVacancy(
      vacancy({
        description: 'At least 2 years of experience with Node.js. With its strong over 55-year heritage, the company...',
      }),
      candidateProfile
    )
    expect(result.reasons.some(r => r.includes('55'))).toBe(false)
    expect(result.reasons.some(r => r.includes('years of experience'))).toBe(false) // 2 years is at the soft limit
  })

  it('does not flag required experience at or below the soft limit', () => {
    const result = filterVacancy(vacancy({ description: '2 lata doświadczenia with Node.js and PostgreSQL.' }), candidateProfile)
    expect(result.reasons.some(r => r.includes('years of experience'))).toBe(false)
  })

  it('flags a language requirement the profile does not have', () => {
    const result = filterVacancy(vacancy({ description: 'Node.js, PostgreSQL. Wymagana znajomość niemieckiego.' }), candidateProfile)
    expect(result.pass).toBe(true)
    expect(result.reasons.some(r => r.includes('German'))).toBe(true)
  })

  it('does not flag a language the profile already lists (Polish/English/Ukrainian)', () => {
    const result = filterVacancy(vacancy({ description: 'Node.js, PostgreSQL. English and Polish required.' }), candidateProfile)
    expect(result.reasons.some(r => r.toLowerCase().includes('language') || r.includes('mentions'))).toBe(false)
  })

  it('can stack multiple flags at once without rejecting', () => {
    const result = filterVacancy(
      vacancy({
        title: 'PHP Developer',
        description: 'PHP, Symfony. 6 lat doświadczenia required. Znajomość francuskiego mile widziana.',
        location: 'Kraków',
        remote: false,
      }),
      candidateProfile
    )
    expect(result.pass).toBe(true)
    expect(result.reasons.length).toBeGreaterThanOrEqual(3)
  })
})
