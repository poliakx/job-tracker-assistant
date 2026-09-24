import { describe, expect, it } from 'vitest'
import { timeAgo } from './timeAgo'

describe('timeAgo', () => {
  it('says "just now" for under a minute', () => {
    expect(timeAgo(new Date().toISOString())).toBe('just now')
  })

  it('formats minutes', () => {
    expect(timeAgo(new Date(Date.now() - 5 * 60000).toISOString())).toBe('5m ago')
  })

  it('formats hours', () => {
    expect(timeAgo(new Date(Date.now() - 3 * 3600000).toISOString())).toBe('3h ago')
  })

  it('formats days', () => {
    expect(timeAgo(new Date(Date.now() - 2 * 86400000).toISOString())).toBe('2d ago')
  })
})
