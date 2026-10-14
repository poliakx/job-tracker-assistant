// Minimal robots.txt matcher (RFC 9309) — enough to answer "may this user
// agent fetch this path?" for the job boards we scrape. Pure, so it's
// testable without the network; the fetching and caching live in http.ts.

type Rule = { allow: boolean; pattern: string }
type Group = { agents: string[]; rules: Rule[] }

function parseGroups(robotsTxt: string): Group[] {
  const groups: Group[] = []
  let current: Group | null = null
  // A run of consecutive User-agent lines opens one group; the first rule
  // line after them closes the agent list.
  let collectingAgents = false

  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    const sep = line.indexOf(':')
    if (sep === -1) continue
    const key = line.slice(0, sep).trim().toLowerCase()
    const value = line.slice(sep + 1).trim()

    if (key === 'user-agent') {
      if (!collectingAgents) {
        current = { agents: [], rules: [] }
        groups.push(current)
        collectingAgents = true
      }
      current!.agents.push(value.toLowerCase())
    } else if (key === 'allow' || key === 'disallow') {
      collectingAgents = false
      // An empty Disallow means "allow everything" — no rule to add.
      if (current && value !== '') current.rules.push({ allow: key === 'allow', pattern: value })
    }
  }
  return groups
}

// The product token robots.txt groups are matched against: the part of the
// User-Agent header before the first "/" (e.g. "ApplicationTrackerBot").
export function productToken(userAgent: string): string {
  return userAgent.split('/')[0].trim().toLowerCase()
}

function selectRules(groups: Group[], token: string): Rule[] {
  const specific = groups.filter(g => g.agents.some(a => a !== '*' && token.includes(a)))
  const chosen = specific.length > 0 ? specific : groups.filter(g => g.agents.includes('*'))
  return chosen.flatMap(g => g.rules)
}

function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith('$')
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split('*')
    .map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${body}${anchored ? '$' : ''}`)
}

// pathWithQuery: URL pathname + search, e.g. "/filtry/backend;sp?page=2".
export function isAllowed(robotsTxt: string, userAgent: string, pathWithQuery: string): boolean {
  const rules = selectRules(parseGroups(robotsTxt), productToken(userAgent))
  // Longest matching pattern wins; on a tie, Allow wins.
  let best: Rule | null = null
  for (const rule of rules) {
    if (!patternToRegExp(rule.pattern).test(pathWithQuery)) continue
    if (
      !best ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow)
    ) {
      best = rule
    }
  }
  return best ? best.allow : true
}
