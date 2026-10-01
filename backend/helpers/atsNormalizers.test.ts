import { describe, expect, it } from 'vitest'
import { normalizeAshbyJob, normalizeGreenhouseJob, normalizeLeverPosting } from './atsNormalizers'
import greenhouse from '@/backend/sources/__fixtures__/greenhouse-jobs.json'
import lever from '@/backend/sources/__fixtures__/lever-postings.json'
import ashby from '@/backend/sources/__fixtures__/ashby-jobs.json'

describe('normalizeGreenhouseJob', () => {
  it('maps a remote job with entity-encoded HTML content', () => {
    expect(normalizeGreenhouseJob(greenhouse.jobs[0], 'Fallback')).toEqual({
      externalId: '4012345',
      title: 'Junior Backend Engineer',
      company: 'Example Corp',
      url: 'https://job-boards.greenhouse.io/examplecorp/jobs/4012345',
      location: 'Remote - Europe',
      remote: true,
      description: 'We build made-up tools.\n- Node.js\n- PostgreSQL',
      postedAt: new Date('2026-09-18T12:00:00Z'),
    })
  })

  it('falls back to the source label for the company and updated_at for the date', () => {
    const result = normalizeGreenhouseJob(greenhouse.jobs[1], 'Fallback')
    expect(result.company).toBe('Fallback')
    expect(result.remote).toBe(false)
    expect(result.description).toBe('')
    expect(result.postedAt).toEqual(new Date('2026-09-25T12:00:00Z'))
  })
})

describe('normalizeLeverPosting', () => {
  it('joins locations and description sections', () => {
    expect(normalizeLeverPosting(lever[0], 'Example Corp')).toEqual({
      externalId: '5a1b2c3d-0000-4000-8000-000000000001',
      title: 'Junior Full-Stack Developer',
      company: 'Example Corp',
      url: 'https://jobs.lever.co/examplecorp/5a1b2c3d-0000-4000-8000-000000000001',
      location: 'Kraków, Wrocław',
      remote: false,
      description: 'A fictional team building fictional things.\n\nRequirements\n- TypeScript\n- React\n\nMade-up benefits.',
      postedAt: new Date(1790000000000),
    })
  })

  it('reads workplaceType "remote" and tolerates missing fields', () => {
    const result = normalizeLeverPosting(lever[1], 'Example Corp')
    expect(result.remote).toBe(true)
    expect(result.location).toBe('Not specified')
    expect(result.description).toBe('')
    expect(result.postedAt).toBeNull()
  })
})

describe('normalizeAshbyJob', () => {
  it('maps a remote job', () => {
    expect(normalizeAshbyJob(ashby.jobs[0], 'Example Corp')).toEqual({
      externalId: '9f8e7d6c-0000-4000-8000-000000000001',
      title: 'Junior Software Engineer',
      company: 'Example Corp',
      url: 'https://jobs.ashbyhq.com/examplecorp/9f8e7d6c-0000-4000-8000-000000000001',
      location: 'Berlin',
      remote: true,
      description: 'Invented description for tests.',
      postedAt: new Date('2026-09-22T10:00:00Z'),
    })
  })
})
