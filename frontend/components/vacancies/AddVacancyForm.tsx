"use client"
import React, { useState } from 'react'

const MIN_LENGTH = 50

// One box: paste the whole posting. Title, company, location and link are
// pulled out of it on the server; the full text is what the match is
// scored against.
export default function AddVacancyForm({ onSubmit, onCancel }: { onSubmit: (text: string) => Promise<void>; onCancel?: () => void }) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tooShort = text.trim().length < MIN_LENGTH

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (tooShort) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(text)
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the vacancy.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste the whole vacancy here — title, company, responsibilities, requirements, and the link if you have it."
        rows={14}
        autoFocus
        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
        disabled={submitting}
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || tooShort}
          className="px-3 py-2 rounded-lg text-sm bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {submitting ? 'Adding…' : 'Add and analyze'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
