import { afterEach, describe, expect, it, vi } from 'vitest'
import { describeRepos, getRepoDetails, GithubError, listRepos, parseGithubUsername } from './github'

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, ...init })
}

const apiRepo = (over: Record<string, unknown> = {}) => ({
  name: 'tracker',
  full_name: 'octocat/tracker',
  html_url: 'https://github.com/octocat/tracker',
  description: 'Job tracker',
  language: 'TypeScript',
  topics: ['nextjs'],
  stargazers_count: 3,
  pushed_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
  fork: false,
  archived: false,
  private: false,
  owner: { login: 'octocat' },
  ...over,
})

describe('parseGithubUsername', () => {
  it.each([
    ['octocat', 'octocat'],
    ['@octocat', 'octocat'],
    ['github.com/octocat', 'octocat'],
    ['https://www.github.com/octocat/', 'octocat'],
    ['https://github.com/octocat/tracker', 'octocat'],
    ['  my-name  ', 'my-name'],
  ])('reads %s', (input, expected) => {
    expect(parseGithubUsername(input)).toBe(expected)
  })

  it.each(['', 'bad name', '-leading', 'double--hyphen', 'https://gitlab.com/x', 'a'.repeat(40)])('rejects %j', input => {
    expect(parseGithubUsername(input)).toBeNull()
  })
})

describe('GitHub API calls', () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  afterEach(() => {
    fetchMock.mockReset()
    delete process.env.GITHUB_TOKEN
  })

  it('lists own repos without forks or archived ones', async () => {
    fetchMock.mockResolvedValue(json([apiRepo(), apiRepo({ name: 'fork', fork: true }), apiRepo({ name: 'old', archived: true })]))
    const repos = await listRepos('octocat')
    expect(repos.map(r => r.name)).toEqual(['tracker'])
    expect(repos[0]).toMatchObject({ url: 'https://github.com/octocat/tracker', updatedAt: '2026-09-01T10:00:00Z' })
    expect(fetchMock.mock.calls[0][0]).toContain('/users/octocat/repos')
  })

  it('sends GITHUB_TOKEN when set', async () => {
    process.env.GITHUB_TOKEN = 'secret'
    fetchMock.mockResolvedValue(json([]))
    await listRepos('octocat')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer secret')
  })

  it('reports an unknown user as 404', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 404 }))
    await expect(listRepos('nobody')).rejects.toMatchObject({ status: 404 })
  })

  it('reports an exhausted rate limit as 429', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 403, headers: { 'x-ratelimit-remaining': '0' } }))
    const err = await listRepos('octocat').catch(e => e)
    expect(err).toBeInstanceOf(GithubError)
    expect(err.status).toBe(429)
  })

  it('reads repo details, tolerating a missing README', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/languages')) return json({ TypeScript: 900, CSS: 100 })
      if (url.endsWith('/readme')) return new Response('{}', { status: 404 })
      return json(apiRepo())
    })
    const details = await getRepoDetails('octocat', 'tracker')
    expect(details.languages).toEqual(['TypeScript', 'CSS'])
    expect(details.readme).toBe('')
  })

  it('truncates long READMEs', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/languages')) return json({})
      if (url.endsWith('/readme')) return new Response('x'.repeat(10_000))
      return json(apiRepo())
    })
    expect((await getRepoDetails('octocat', 'tracker')).readme).toHaveLength(4000)
  })
})

describe('describeRepos', () => {
  it('includes what the extractor needs and skips empty fields', () => {
    const text = describeRepos([
      {
        name: 'tracker',
        fullName: 'octocat/tracker',
        url: 'https://github.com/octocat/tracker',
        description: '',
        language: 'TypeScript',
        topics: [],
        stars: 0,
        updatedAt: '2026-09-01T10:00:00Z',
        isPrivate: false,
        languages: ['TypeScript'],
        readme: '',
      },
    ])
    expect(text).toContain('## tracker')
    expect(text).toContain('URL: https://github.com/octocat/tracker')
    expect(text).toContain('Languages: TypeScript')
    expect(text).toContain('Last pushed: 2026-09-01')
    expect(text).toContain('README: (none)')
    expect(text).not.toContain('Description:')
    expect(text).not.toContain('Topics:')
  })
})
