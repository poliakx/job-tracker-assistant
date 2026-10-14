import { describe, expect, it } from 'vitest'
import { formatProfile } from './prompts'
import { candidateProfile } from '@/backend/profile/seed'
import type { EnglishAssessmentResult } from '@/types'

describe('formatProfile', () => {
  it('labels the kind of every job and project so project work cannot pass as commercial', () => {
    const text = formatProfile({
      ...candidateProfile,
      workExperience: [
        { title: 'Backend Intern', company: 'Acme', location: '', kind: 'INTERNSHIP', startDate: '03.2024', endDate: '06.2024', description: 'APIs', achievements: [], tech: [] },
      ],
      projects: [{ name: 'Tracker', kind: 'PERSONAL', role: 'solo', description: 'Job tracker', achievements: [], tech: ['Next.js'], url: '', links: [] }],
    })
    expect(text).toContain('Backend Intern at Acme [internship] (03.2024 – 06.2024)')
    expect(text).toContain('Tracker [personal project, role: solo]')
  })

  it("includes the measured English level, and says what wasn't measured", () => {
    const english: EnglishAssessmentResult = {
      overall: 'B2',
      skills: { grammar: 'B2', vocabulary: 'B1', reading: 'C1', writing: 'B2', interaction: 'B2' },
      summary: '',
      strengths: [],
      mistakes: [],
      recommendations: [],
    }
    const text = formatProfile(candidateProfile, english)
    expect(text).toContain('English, measured by the app')
    expect(text).toContain('B2 overall')
    expect(text).toContain('speaking/listening not measured')
  })

  it('never includes contact details', () => {
    const text = formatProfile({ ...candidateProfile, contact: { ...candidateProfile.contact, email: 'jan@example.com' } })
    expect(text).not.toContain('jan@example.com')
  })
})
