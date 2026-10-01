import { describe, expect, it } from 'vitest'
import { profileCompleteness } from './profileCompleteness'
import { candidateProfile } from '@/backend/profile'

function missing(profile: typeof candidateProfile) {
  return profileCompleteness(profile)
    .filter(i => !i.ok)
    .map(i => i.label)
}

describe('profileCompleteness', () => {
  it('flags everything a bare profile is missing', () => {
    const bare = { ...candidateProfile, headline: '' }
    expect(missing(bare)).toEqual([
      'Name and email',
      'GitHub or LinkedIn link',
      'Headline',
      'At least one job or project',
      'Education',
      'Language levels',
    ])
  })

  it('counts undated jobs and thin projects', () => {
    const profile = {
      ...candidateProfile,
      workExperience: [
        { title: 'Dev', company: 'A', location: '', kind: 'INTERNSHIP' as const, startDate: '', endDate: '', description: '', achievements: [], tech: [] },
      ],
      projects: [{ name: 'P', kind: 'PERSONAL' as const, role: '', description: '', achievements: [], tech: [], url: '' }],
    }
    const labels = missing(profile)
    expect(labels).toContain('Dates for 1 job(s)')
    expect(labels).toContain('Description and tech for 1 project(s)')
    expect(labels).not.toContain('At least one job or project')
  })
})
