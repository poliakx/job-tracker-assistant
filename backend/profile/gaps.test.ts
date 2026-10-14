import { describe, expect, it } from 'vitest'
import { findProfileGaps } from './gaps'
import { candidateProfile } from './seed'
import { buildUpdateInterviewSystemPrompt } from './interview/prompts'
import type { CandidateProfile, EnglishAssessmentResult, ProjectEntry } from '@/types'

function project(overrides: Partial<ProjectEntry> = {}): ProjectEntry {
  return {
    name: 'Shop',
    kind: 'PERSONAL',
    role: 'solo',
    description: 'An online shop',
    achievements: ['Built checkout with Stripe', 'Wrote 40 integration tests'],
    tech: ['Node.js'],
    url: '',
    links: [],
    ...overrides,
  }
}

const complete: CandidateProfile = {
  ...candidateProfile,
  workExperience: [
    { title: 'Dev', company: 'Acme', location: '', kind: 'FREELANCE', startDate: '01.2025', endDate: 'Present', description: 'x', achievements: [], tech: [] },
  ],
  education: [{ institution: 'University', degree: 'BSc', field: 'CS', startDate: '2020', endDate: '2024', details: '' }],
  projects: [project()],
  languageLevels: [{ language: 'English', level: 'B2' }],
}

function english(overall: EnglishAssessmentResult['overall']): EnglishAssessmentResult {
  return { overall } as EnglishAssessmentResult
}

describe('findProfileGaps', () => {
  it('finds nothing in a complete profile', () => {
    expect(findProfileGaps(complete)).toEqual([])
  })

  it('asks about missing work experience and education', () => {
    const gaps = findProfileGaps({ ...complete, workExperience: [], education: [] })
    expect(gaps).toHaveLength(2)
    expect(gaps[0]).toMatch(/No work experience/)
    expect(gaps[1]).toMatch(/No education/)
  })

  it('names each project with too little detail', () => {
    const gaps = findProfileGaps({
      ...complete,
      projects: [project(), project({ name: 'Photography Portfolio', achievements: ['Built a portfolio website'] }), project({ name: 'Blog', description: '' })],
    })
    expect(gaps).toHaveLength(2)
    expect(gaps[0]).toContain('"Photography Portfolio"')
    expect(gaps[1]).toContain('"Blog"')
  })

  it('points out an English test result that differs from the profile', () => {
    const [gap] = findProfileGaps(complete, english('A2'))
    expect(gap).toContain('measured A2, while the profile says B2')
    expect(findProfileGaps(complete, english('B2'))).toEqual([])
  })

  it('asks for language levels when there are none', () => {
    const gaps = findProfileGaps({ ...complete, languageLevels: [] })
    expect(gaps[0]).toMatch(/No language levels/)
  })
})

describe('buildUpdateInterviewSystemPrompt', () => {
  it('lists the gaps for the interviewer to go through first', () => {
    const prompt = buildUpdateInterviewSystemPrompt({ ...complete, education: [] })
    expect(prompt).toContain('go through every one of them')
    expect(prompt).toContain('1. No education is listed.')
  })

  it('says so when there are no gaps', () => {
    expect(buildUpdateInterviewSystemPrompt(complete)).toContain('No obvious gaps were found')
  })
})
