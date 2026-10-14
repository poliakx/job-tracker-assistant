// Reads the owner's public repositories from the official GitHub REST API so
// they can be turned into profile projects. Unauthenticated requests are
// limited to 60/hour; GITHUB_TOKEN (optional, server-side only) raises that
// to 5000. Only public repos are listed either way.
import type { GithubRepo } from '@/types'
import { userAgent } from './sources/http'

const API = 'https://api.github.com'
const REQUEST_TIMEOUT_MS = 15_000
// README text sent to the LLM per repo — enough for the summary and stack,
// without paying for long install/usage sections.
const README_MAX_CHARS = 4000

export interface GithubRepoDetails extends GithubRepo {
  languages: string[]
  readme: string
}

export class GithubError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

// Accepts what people type into the contact form: "octocat", "@octocat",
// "github.com/octocat", "https://github.com/octocat/some-repo".
export function parseGithubUsername(input: string): string | null {
  const trimmed = input.trim().replace(/^@/, '')
  if (!trimmed) return null
  const match = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)/i)
  const user = match ? match[1] : trimmed
  // GitHub usernames: alphanumerics and single hyphens, max 39 chars.
  return /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(user) ? user : null
}

async function githubFetch(path: string, accept = 'application/vnd.github+json'): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: accept,
    'User-Agent': userAgent(),
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  if (res.ok || res.status === 404) return res
  if ((res.status === 403 || res.status === 429) && res.headers.get('x-ratelimit-remaining') === '0') {
    throw new GithubError('GitHub rate limit reached — try again in an hour, or set GITHUB_TOKEN', 429)
  }
  throw new GithubError(`GitHub responded with HTTP ${res.status}`, 502)
}

interface ApiRepo {
  name: string
  full_name: string
  html_url: string
  description: string | null
  language: string | null
  topics?: string[]
  stargazers_count: number
  pushed_at: string | null
  updated_at: string
  fork: boolean
  archived: boolean
  private: boolean
  owner: { login: string }
}

function toRepo(r: ApiRepo): GithubRepo {
  return {
    name: r.name,
    fullName: r.full_name,
    url: r.html_url,
    description: r.description ?? '',
    language: r.language,
    topics: r.topics ?? [],
    stars: r.stargazers_count,
    updatedAt: r.pushed_at ?? r.updated_at,
    isPrivate: r.private,
  }
}

// The user's own repos, most recently pushed first. Forks and archived repos
// are left out — they rarely represent the owner's work.
export async function listRepos(user: string): Promise<GithubRepo[]> {
  const res = await githubFetch(`/users/${encodeURIComponent(user)}/repos?type=owner&sort=pushed&per_page=100`)
  if (res.status === 404) throw new GithubError(`GitHub user "${user}" not found`, 404)
  const repos = (await res.json()) as ApiRepo[]
  return repos.filter(r => !r.fork && !r.archived).map(toRepo)
}

export async function getRepoDetails(user: string, repo: string): Promise<GithubRepoDetails> {
  const base = `/repos/${encodeURIComponent(user)}/${encodeURIComponent(repo)}`
  const [repoRes, langRes, readmeRes] = await Promise.all([
    githubFetch(base),
    githubFetch(`${base}/languages`),
    githubFetch(`${base}/readme`, 'application/vnd.github.raw+json'),
  ])
  if (repoRes.status === 404) throw new GithubError(`Repository ${user}/${repo} not found`, 404)
  const info = toRepo((await repoRes.json()) as ApiRepo)
  // Ordered by bytes of code, largest first.
  const languages = langRes.ok ? Object.keys((await langRes.json()) as Record<string, number>) : []
  const readme = readmeRes.ok ? (await readmeRes.text()).slice(0, README_MAX_CHARS) : ''
  return { ...info, languages, readme }
}

// The repos as one block of text for the profile extractor.
export function describeRepos(repos: GithubRepoDetails[]): string {
  return repos
    .map(r =>
      [
        `## ${r.name}`,
        `URL: ${r.url}`,
        r.description && `Description: ${r.description}`,
        r.languages.length > 0 && `Languages: ${r.languages.join(', ')}`,
        r.topics.length > 0 && `Topics: ${r.topics.join(', ')}`,
        `Last pushed: ${r.updatedAt.slice(0, 10)}`,
        r.readme ? `README:\n${r.readme}` : 'README: (none)',
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n')
}
