import { describe, expect, it } from 'vitest'
import { findUnsupportedSkills } from './resume'
import { candidateProfile } from './profile'
import type { ResumeContent } from '@/types'

function resume(skills: string[], projectTech: string[] = []): ResumeContent {
  return {
    headline: '',
    summary: '',
    skills: [{ category: 'All', items: skills }],
    experience: [],
    projects: [{ name: 'P', url: '', tech: projectTech, bullets: [] }],
    education: [],
    certifications: [],
    languages: [],
  }
}

describe('findUnsupportedSkills', () => {
  it('passes skills the profile mentions, ignoring case, spacing and dots', () => {
    expect(findUnsupportedSkills(resume(['node js', 'POSTGRESQL', 'NextJS', 'tailwind css']), candidateProfile)).toEqual([])
  })

  it('flags skills the profile never mentions, including project tech', () => {
    expect(findUnsupportedSkills(resume(['React', 'Kubernetes'], ['GraphQL']), candidateProfile)).toEqual(['Kubernetes', 'GraphQL'])
  })

  it("flags a skill that's only on the candidate's does-NOT-know list", () => {
    // The seed profile lists Java under conflictingStackKeywords.
    expect(findUnsupportedSkills(resume(['Java']), candidateProfile)).toEqual(['Java'])
  })

  it('does not treat "JavaScript" as evidence of "Java"', () => {
    const profile = { ...candidateProfile, stack: { ...candidateProfile.stack, frontend: ['JavaScript'] } }
    expect(findUnsupportedSkills(resume(['JavaScript', 'Java']), profile)).toEqual(['Java'])
  })

  it('treats a plural as the same skill ("REST APIs" vs the profile\'s "REST API")', () => {
    expect(findUnsupportedSkills(resume(['REST APIs']), candidateProfile)).toEqual([])
  })

  it('accepts a skill named as a whole word in free text', () => {
    const profile = { ...candidateProfile, about: 'I also deploy my projects with GitHub Actions.' }
    expect(findUnsupportedSkills(resume(['GitHub Actions']), profile)).toEqual([])
  })

  it('does not treat a contact detail as evidence of a skill', () => {
    const profile = { ...candidateProfile, contact: { ...candidateProfile.contact, portfolio: 'rust-dev.example.com' } }
    expect(findUnsupportedSkills(resume(['Rust']), profile)).toEqual(['Rust'])
  })

  it('keeps C# and C++ distinct from C', () => {
    const profile = { ...candidateProfile, stack: { ...candidateProfile.stack, alsoKnows: ['C'] } }
    expect(findUnsupportedSkills(resume(['C++']), profile)).toEqual(['C++'])
  })
})
