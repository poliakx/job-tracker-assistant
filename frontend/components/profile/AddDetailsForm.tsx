"use client"
import React, { useState } from 'react'
import { CandidateProfile } from '@/types'

// Free-form alternative to the follow-up interview: the owner writes the
// details themselves, and they're merged into the saved profile the same
// way an interview transcript is (update-mode extraction). The result is
// returned for review — nothing is saved here.
export default function AddDetailsForm({ onExtracted }: { onExtracted: (profile: CandidateProfile) => void }) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const details = text.trim()
    if (!details) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/interview/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'update',
          messages: [
            { role: 'assistant', content: 'What would you like to add to or correct in your profile?' },
            { role: 'user', content: details },
          ],
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      onExtracted(body as CandidateProfile)
    } catch (err) {
      const reason = err instanceof Error ? ` (${err.message})` : ''
      setError(`Could not process these details${reason}. Your text is kept — try again.`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="E.g. a new project with its stack and what you built, a course you finished, a skill you now use at work, a correction to a date…"
        rows={6}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
        disabled={submitting}
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !text.trim()}
        className="px-3 py-2 rounded-lg text-sm bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {submitting ? 'Processing… (about 30 seconds)' : 'Add to profile'}
      </button>
    </form>
  )
}
