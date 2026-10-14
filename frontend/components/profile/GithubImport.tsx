"use client"
import React, { useState } from 'react'
import type { CandidateProfile, GithubRepo } from '@/types'

const MAX_SELECTED = 10

function normalizeUrl(url: string) {
  return url.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '')
}

// Lists the owner's GitHub repos, lets them pick some, and merges those into
// the profile as projects. Like AddDetailsForm, the result is returned for
// review — nothing is saved here.
export default function GithubImport({
  initialUser,
  existingProjectUrls,
  onExtracted,
}: {
  initialUser: string
  existingProjectUrls: string[]
  onExtracted: (profile: CandidateProfile) => void
}) {
  const [user, setUser] = useState(initialUser)
  const [repos, setRepos] = useState<GithubRepo[] | null>(null)
  // The account the listed repos belong to — the input may have been edited
  // since, and the import must read the repos that were actually listed.
  const [loadedUser, setLoadedUser] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [state, setState] = useState<'idle' | 'loading' | 'importing'>('idle')
  const [error, setError] = useState<string | null>(null)

  const inProfile = new Set(existingProjectUrls.filter(Boolean).map(normalizeUrl))

  async function handleLoad(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setError(null)
    try {
      const res = await fetch(`/api/profile/github?user=${encodeURIComponent(user.trim())}`)
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setRepos(body.repos)
      setLoadedUser(body.user)
      setSelected(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load repositories.')
    } finally {
      setState('idle')
    }
  }

  function toggle(name: string) {
    const next = new Set(selected)
    if (next.has(name)) next.delete(name)
    else if (next.size < MAX_SELECTED) next.add(name)
    setSelected(next)
  }

  async function handleImport() {
    setState('importing')
    setError(null)
    try {
      const res = await fetch('/api/profile/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: loadedUser, repos: Array.from(selected) }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      onExtracted(body as CandidateProfile)
    } catch (err) {
      const reason = err instanceof Error ? ` (${err.message})` : ''
      setError(`Could not import these repositories${reason}. Try again.`)
    } finally {
      setState('idle')
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleLoad} className="flex gap-2">
        <input
          value={user}
          onChange={e => setUser(e.target.value)}
          placeholder="GitHub username or github.com/… link"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
          disabled={state !== 'idle'}
        />
        <button
          type="submit"
          disabled={state !== 'idle' || !user.trim()}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50 shrink-0"
        >
          {state === 'loading' ? 'Loading…' : 'Load repositories'}
        </button>
      </form>

      {repos && repos.length === 0 && <p className="text-sm text-gray-500">No public repositories of your own found.</p>}

      {repos && repos.length > 0 && (
        <>
          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
            {repos.map(r => {
              const already = inProfile.has(normalizeUrl(r.url))
              const checked = selected.has(r.name)
              return (
                <li key={r.fullName}>
                  <label className="flex items-start gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(r.name)}
                      disabled={state !== 'idle' || (!checked && selected.size >= MAX_SELECTED)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-gray-900">{r.name}</span>
                      {r.language && <span className="ml-2 text-xs text-gray-500">{r.language}</span>}
                      {already && <span className="ml-2 text-xs text-green-700">in profile</span>}
                      {r.description && <span className="block text-xs text-gray-500 truncate">{r.description}</span>}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              disabled={state !== 'idle' || selected.size === 0}
              className="px-3 py-2 rounded-lg text-sm bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {state === 'importing' ? 'Importing… (about 30 seconds)' : `Import ${selected.size || ''} as projects`}
            </button>
            <span className="text-xs text-gray-500">Up to {MAX_SELECTED} at a time. Re-importing one updates it.</span>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
