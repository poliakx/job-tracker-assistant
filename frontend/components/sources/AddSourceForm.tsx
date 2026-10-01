"use client"
import React, { useState } from 'react'
import type { SourceKind } from '@/types'
import { SOURCE_KIND_OPTIONS } from '@/frontend/helpers/constants'
import type { NewSource } from '@/frontend/hooks/useSources'

const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm'

// Adding a source is two steps in one form: what to read, then why it's
// allowed. The second half isn't optional — the server rejects a source
// without a terms link, a note and the confirmation.
export default function AddSourceForm({ onSubmit, onCancel }: { onSubmit: (s: NewSource) => Promise<void>; onCancel: () => void }) {
  const [kind, setKind] = useState<SourceKind>('greenhouse')
  const [identifier, setIdentifier] = useState('')
  const [label, setLabel] = useState('')
  const [termsUrl, setTermsUrl] = useState(SOURCE_KIND_OPTIONS[0].docsUrl ?? '')
  const [termsNote, setTermsNote] = useState('')
  const [termsConfirmed, setTermsConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const option = SOURCE_KIND_OPTIONS.find(o => o.value === kind) ?? SOURCE_KIND_OPTIONS[0]
  const ready = identifier.trim() && label.trim() && termsUrl.trim() && termsNote.trim().length >= 20 && termsConfirmed

  function changeKind(next: SourceKind) {
    // Swap the prefilled docs link along with the kind, but never overwrite
    // a link the user typed themselves.
    const wasDefault = !termsUrl || SOURCE_KIND_OPTIONS.some(o => o.docsUrl === termsUrl)
    setKind(next)
    if (wasDefault) setTermsUrl(SOURCE_KIND_OPTIONS.find(o => o.value === next)?.docsUrl ?? '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ kind, identifier, label, termsUrl, termsNote, termsConfirmed })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the source.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <fieldset className="space-y-3" disabled={submitting}>
        <legend className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">1. What to read</legend>
        <label className="block">
          <span className="block text-sm text-gray-700 mb-1">Type</span>
          <select value={kind} onChange={e => changeKind(e.target.value as SourceKind)} className={inputClass}>
            {SOURCE_KIND_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm text-gray-700 mb-1">{option.identifierLabel}</span>
          <input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={option.placeholder} className={inputClass} />
          <span className="block text-xs text-gray-500 mt-1">{option.hint}</span>
        </label>
        <label className="block">
          <span className="block text-sm text-gray-700 mb-1">Name</span>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Acme Inc." className={inputClass} />
          <span className="block text-xs text-gray-500 mt-1">Shown in the app; also used as the company name when the source doesn&rsquo;t give one.</span>
        </label>
      </fieldset>

      <fieldset className="space-y-3" disabled={submitting}>
        <legend className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">2. Why it&rsquo;s allowed</legend>
        <label className="block">
          <span className="block text-sm text-gray-700 mb-1">Terms or API documentation you checked</span>
          <input value={termsUrl} onChange={e => setTermsUrl(e.target.value)} placeholder="https://example.com/terms" className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-sm text-gray-700 mb-1">What it says</span>
          <textarea
            value={termsNote}
            onChange={e => setTermsNote(e.target.value)}
            rows={3}
            placeholder="e.g. “Public API for listing a company’s open jobs; no authentication required and no restriction on automated use.”"
            className={inputClass}
          />
        </label>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={termsConfirmed} onChange={e => setTermsConfirmed(e.target.checked)} className="mt-0.5" />
          <span>
            I read these terms and they don&rsquo;t forbid automated access to this source. I&rsquo;m responsible for using it within
            them.
          </span>
        </label>
        <p className="text-xs text-gray-500">robots.txt is checked automatically when you add the source, and before every request.</p>
      </fieldset>

      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !ready}
          className="px-3 py-2 rounded-lg text-sm bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {submitting ? 'Checking…' : 'Add source'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  )
}
