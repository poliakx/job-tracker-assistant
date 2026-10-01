// A deliberately small RSS 2.0 / Atom parser — enough for job feeds (title,
// link, id, date, description) without pulling in an XML library. Items it
// can't make sense of (no title or no link) are skipped, not fatal.
import { decodeEntities } from './htmlText'

export interface FeedItem {
  id: string
  title: string
  link: string
  // Raw HTML or text; run through htmlToText before use.
  content: string
  published: Date | null
}

// The text inside the first <tag>…</tag>, CDATA unwrapped. Entities are
// left encoded for the caller: an HTML description stays HTML.
function tagText(block: string, tag: string): string | null {
  const escaped = tag.replace(':', '\\:')
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</${escaped}>`, 'i'))
  if (!match) return null
  const cdata = match[1].match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/)
  return (cdata ? cdata[1] : match[1]).trim()
}

function plain(block: string, tag: string): string | null {
  const text = tagText(block, tag)
  return text === null ? null : decodeEntities(text).trim()
}

// Atom: <link href="…"/>, preferring rel="alternate" (or no rel).
function atomLink(block: string): string | null {
  const links = [...block.matchAll(/<link\b([^>]*)\/?>/gi)].map(m => m[1])
  const attr = (attrs: string, name: string) => attrs.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1]
  const preferred = links.find(a => !attr(a, 'rel') || attr(a, 'rel') === 'alternate') ?? links[0]
  const href = preferred ? attr(preferred, 'href') : undefined
  return href ? decodeEntities(href) : null
}

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function parseFeed(xml: string): FeedItem[] {
  const isAtom = /<feed\b/i.test(xml) && !/<rss\b/i.test(xml)
  const blocks = [...xml.matchAll(isAtom ? /<entry\b[\s\S]*?<\/entry>/gi : /<item\b[\s\S]*?<\/item>/gi)].map(m => m[0])

  const items: FeedItem[] = []
  for (const block of blocks) {
    const title = plain(block, 'title')
    const link = isAtom ? atomLink(block) : plain(block, 'link')
    if (!title || !link) continue
    const id = plain(block, isAtom ? 'id' : 'guid') || link
    const content =
      (isAtom ? tagText(block, 'content') ?? tagText(block, 'summary') : tagText(block, 'content:encoded') ?? tagText(block, 'description')) ?? ''
    const published = parseDate(
      isAtom ? plain(block, 'published') ?? plain(block, 'updated') : plain(block, 'pubDate') ?? plain(block, 'dc:date')
    )
    items.push({ id, title, link, content, published })
  }
  return items
}
