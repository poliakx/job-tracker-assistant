"use client"
import React, { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { safeNextPath } from '@/frontend/helpers/safeNextPath'

// The sign-in screen for a deployed instance (APP_PASSWORD, see
// backend/auth.ts and middleware.ts). Covers the whole viewport, so the
// app shell from the root layout stays hidden behind it.
function LoginForm() {
  const next = safeNextPath(useSearchParams()?.get('next'))
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      // A full navigation, so the middleware sees the new cookie.
      window.location.assign(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white grid place-items-center text-sm font-semibold shadow-sm">
          JT
        </span>
        <h1 className="text-base font-semibold text-gray-900">Job Tracker</h1>
      </div>
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        autoComplete="current-password"
        autoFocus
        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
        disabled={submitting}
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !password}
        className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="fixed inset-0 z-50 bg-gray-50 grid place-items-center px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
