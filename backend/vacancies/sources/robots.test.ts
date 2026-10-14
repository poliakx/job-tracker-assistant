import { describe, expect, it } from 'vitest'
import { isAllowed, productToken } from './robots'

const UA = 'ApplicationTrackerBot/0.1 (personal job-search tool)'

describe('productToken', () => {
  it('takes the part before the version slash, lowercased', () => {
    expect(productToken(UA)).toBe('applicationtrackerbot')
  })
})

describe('isAllowed', () => {
  it('allows everything when there are no rules', () => {
    expect(isAllowed('', UA, '/anything')).toBe(true)
    expect(isAllowed('User-agent: *\nDisallow:', UA, '/anything')).toBe(true)
  })

  it('applies the * group when no group names us', () => {
    const txt = 'User-agent: *\nDisallow: /api/\n\nUser-agent: Googlebot\nDisallow: /'
    expect(isAllowed(txt, UA, '/api/offers')).toBe(false)
    expect(isAllowed(txt, UA, '/filtry/backend;sp')).toBe(true)
  })

  it('prefers a group naming our agent over *', () => {
    const txt = 'User-agent: *\nDisallow: /\n\nUser-agent: ApplicationTrackerBot\nAllow: /'
    expect(isAllowed(txt, UA, '/jobs')).toBe(true)
  })

  it('treats consecutive User-agent lines as one group', () => {
    const txt = 'User-agent: foo\nUser-agent: *\nDisallow: /private'
    expect(isAllowed(txt, UA, '/private/x')).toBe(false)
  })

  it('picks the longest matching rule, Allow winning ties', () => {
    const txt = 'User-agent: *\nDisallow: /jobs\nAllow: /jobs/public'
    expect(isAllowed(txt, UA, '/jobs/public/1')).toBe(true)
    expect(isAllowed(txt, UA, '/jobs/secret')).toBe(false)
    expect(isAllowed('User-agent: *\nDisallow: /a\nAllow: /a', UA, '/a')).toBe(true)
  })

  it('supports * wildcards and $ end anchors', () => {
    const txt = 'User-agent: *\nDisallow: /*?sort=\nDisallow: /*.pdf$'
    expect(isAllowed(txt, UA, '/jobs?sort=new')).toBe(false)
    expect(isAllowed(txt, UA, '/cv.pdf')).toBe(false)
    expect(isAllowed(txt, UA, '/cv.pdf.html')).toBe(true)
  })

  it('ignores comments and blank lines', () => {
    const txt = '# hello\nUser-agent: * # everyone\n\nDisallow: /x # no'
    expect(isAllowed(txt, UA, '/x')).toBe(false)
  })
})
