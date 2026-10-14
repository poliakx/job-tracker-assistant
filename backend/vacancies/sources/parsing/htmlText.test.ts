import { describe, expect, it } from 'vitest'
import { decodeEntities, htmlToText } from './htmlText'

describe('decodeEntities', () => {
  it('decodes named, decimal and hex entities and leaves unknown ones', () => {
    expect(decodeEntities('a &amp; b &lt;c&gt; &#8211; &#x2014; &unknown;')).toBe('a & b <c> – — &unknown;')
  })
})

describe('htmlToText', () => {
  it('turns paragraphs, breaks and list items into lines', () => {
    expect(htmlToText('<p>One</p><p>Two<br>Three</p><ul><li>A</li><li>B</li></ul>')).toBe('One\nTwo\nThree\n- A\n- B')
  })

  it('decodes entity-encoded HTML (as Greenhouse sends it) before stripping tags', () => {
    expect(htmlToText('&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;')).toBe('Hello & welcome')
  })

  it('drops script and style contents', () => {
    expect(htmlToText('<style>p{}</style><p>Text</p><script>alert(1)</script>')).toBe('Text')
  })

  it('returns an empty string for empty input', () => {
    expect(htmlToText('')).toBe('')
  })
})
