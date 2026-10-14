import { describe, expect, it } from 'vitest'
import { normalizeJobPosting } from './jobPostingNormalizer'

const PAGE = 'https://example.com/careers'

describe('normalizeJobPosting', () => {
  it('maps a full JobPosting', () => {
    const posting = {
      '@type': 'JobPosting',
      title: 'Junior QA Engineer',
      url: '/careers/qa-1',
      identifier: { '@type': 'PropertyValue', name: 'Example', value: 'QA-1' },
      datePosted: '2026-09-21',
      description: '<p>Made-up role</p>',
      hiringOrganization: { '@type': 'Organization', name: 'Example Ltd' },
      jobLocation: { '@type': 'Place', address: { addressLocality: 'Gdańsk', addressCountry: 'PL' } },
    }
    expect(normalizeJobPosting(posting, PAGE, 'Fallback')).toEqual({
      externalId: 'QA-1',
      title: 'Junior QA Engineer',
      company: 'Example Ltd',
      url: 'https://example.com/careers/qa-1',
      location: 'Gdańsk, PL',
      remote: false,
      description: 'Made-up role',
      postedAt: new Date('2026-09-21'),
    })
  })

  it('handles a remote posting with no location, org or identifier', () => {
    const result = normalizeJobPosting({ title: 'Developer', jobLocationType: 'TELECOMMUTE' }, PAGE, 'Fallback')
    expect(result).toMatchObject({
      externalId: `${PAGE}#Developer`,
      company: 'Fallback',
      url: PAGE,
      location: 'Remote',
      remote: true,
      postedAt: null,
    })
  })

  it('rejects a posting without a title', () => {
    expect(normalizeJobPosting({ description: 'x' }, PAGE, 'Fallback')).toBeNull()
  })
})
