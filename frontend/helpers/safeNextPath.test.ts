import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safeNextPath'

describe('safeNextPath', () => {
  it('keeps a path on this site', () => {
    expect(safeNextPath('/resume?x=1')).toBe('/resume?x=1')
  })

  it('falls back to the dashboard for anything that could leave the site', () => {
    for (const next of ['https://evil.com', '//evil.com', '/\\evil.com', 'resume', '', null, undefined]) {
      expect(safeNextPath(next)).toBe('/')
    }
  })
})
