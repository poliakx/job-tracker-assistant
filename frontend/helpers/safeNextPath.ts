// Where to go after signing in (/login?next=…): only a path on this site,
// never another origin — browsers read "//evil.com" and "/\evil.com" as one.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/'
  return next
}
