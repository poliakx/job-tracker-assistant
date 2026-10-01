import { describe, expect, it } from 'vitest'
import { parseFeed } from './feedParser'

const RSS = `<?xml version="1.0"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Example jobs</title>
    <item>
      <title>Junior Developer &amp; Tester (Remote)</title>
      <link>https://jobs.example.com/offers/1</link>
      <guid isPermaLink="false">offer-1</guid>
      <pubDate>Mon, 28 Sep 2026 10:00:00 GMT</pubDate>
      <description>&lt;p&gt;Short summary&lt;/p&gt;</description>
      <content:encoded><![CDATA[<p>Full <b>made-up</b> description</p>]]></content:encoded>
    </item>
    <item>
      <title>No link, skipped</title>
    </item>
    <item>
      <title>Backend Intern</title>
      <link>https://jobs.example.com/offers/2</link>
      <description>Plain text</description>
    </item>
  </channel>
</rss>`

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example careers</title>
  <entry>
    <title type="html">Frontend Engineer</title>
    <link rel="self" href="https://example.com/api/1"/>
    <link rel="alternate" href="https://example.com/careers/1"/>
    <id>urn:uuid:00000000-0000-4000-8000-000000000001</id>
    <updated>2026-09-27T08:00:00Z</updated>
    <summary>Invented summary</summary>
  </entry>
</feed>`

describe('parseFeed', () => {
  it('reads RSS items, preferring content:encoded and skipping items without a link', () => {
    const items = parseFeed(RSS)
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({
      id: 'offer-1',
      title: 'Junior Developer & Tester (Remote)',
      link: 'https://jobs.example.com/offers/1',
      content: '<p>Full <b>made-up</b> description</p>',
      published: new Date('2026-09-28T10:00:00Z'),
    })
  })

  it('falls back to the link as id and null as date', () => {
    const [, second] = parseFeed(RSS)
    expect(second.id).toBe('https://jobs.example.com/offers/2')
    expect(second.published).toBeNull()
    expect(second.content).toBe('Plain text')
  })

  it('reads Atom entries, using the alternate link', () => {
    expect(parseFeed(ATOM)).toEqual([
      {
        id: 'urn:uuid:00000000-0000-4000-8000-000000000001',
        title: 'Frontend Engineer',
        link: 'https://example.com/careers/1',
        content: 'Invented summary',
        published: new Date('2026-09-27T08:00:00Z'),
      },
    ])
  })

  it('returns nothing for a document that is not a feed', () => {
    expect(parseFeed('<html><body>Not a feed</body></html>')).toEqual([])
  })
})
