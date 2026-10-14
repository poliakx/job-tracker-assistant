import { NextRequest, NextResponse } from 'next/server'
import { describeRepos, getRepoDetails, GithubError, listRepos, parseGithubUsername } from '@/backend/profile/github'
import { extractProfile } from '@/backend/profile/interview/interview'
import { getSavedProfile } from '@/backend/profile/repository'

export const dynamic = 'force-dynamic'

// Each selected repo costs three GitHub requests and README text in the
// prompt, so an import is capped.
const MAX_REPOS = 10

function errorResponse(e: unknown, fallback: string) {
  if (e instanceof GithubError) return NextResponse.json({ error: e.message }, { status: e.status })
  return NextResponse.json({ error: fallback }, { status: 500 })
}

// The username comes from ?user= / the body, or else the GitHub link in the
// saved contact details.
async function resolveUser(given: unknown): Promise<string | null> {
  if (typeof given === 'string' && given.trim()) return parseGithubUsername(given)
  const saved = await getSavedProfile()
  return saved?.contact.github ? parseGithubUsername(saved.contact.github) : null
}

// GET ?user=<name> — the user's own public repos, for the owner to pick from.
export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req.nextUrl.searchParams.get('user'))
    if (!user) return NextResponse.json({ error: 'no valid GitHub username' }, { status: 400 })
    return NextResponse.json({ user, repos: await listRepos(user) })
  } catch (e) {
    return errorResponse(e, 'failed to list GitHub repositories')
  }
}

// POST { user?, repos: string[] } — reads the chosen repos and merges them
// into the saved profile as projects. Like the interview extract, it returns
// the updated profile for review and does NOT save it.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const names: string[] = Array.isArray(body?.repos) ? body.repos.filter((r: unknown) => typeof r === 'string') : []
    if (names.length === 0) return NextResponse.json({ error: 'no repositories selected' }, { status: 400 })
    if (names.length > MAX_REPOS) {
      return NextResponse.json({ error: `select at most ${MAX_REPOS} repositories` }, { status: 400 })
    }
    const user = await resolveUser(body?.user)
    if (!user) return NextResponse.json({ error: 'no valid GitHub username' }, { status: 400 })
    const saved = await getSavedProfile()
    if (!saved) return NextResponse.json({ error: 'save a profile before importing projects' }, { status: 409 })

    const repos = await Promise.all(names.map(name => getRepoDetails(user, name)))
    const outcome = await extractProfile(
      [
        {
          role: 'assistant',
          content:
            'Here are repositories from your GitHub. Which of them should be added to your profile as projects?',
        },
        {
          role: 'user',
          content:
            'Add these repositories to my profile as projects (update a project if it is already there, matched by ' +
            'name or by any of its URLs). Repositories that are parts of the same application — e.g. its frontend ' +
            'and backend — are ONE project: put the main repository URL in url and the others in links. Otherwise ' +
            'use the repository URL as the project url. Treat them as PERSONAL projects unless the README ' +
            'clearly says it was a team, academic, hackathon or open-source project. Take the tech stack from the ' +
            'languages and README, and only list achievements the README actually states — leave role and ' +
            'achievements empty rather than guessing.\n\n' +
            describeRepos(repos),
        },
      ],
      saved
    )
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 502 })
    return NextResponse.json(outcome.result)
  } catch (e) {
    return errorResponse(e, 'failed to import from GitHub')
  }
}
