"use client"
import React, { useState } from 'react'
import type { ContactInfo } from '@/types'

const FIELDS: { key: keyof ContactInfo; label: string; type?: string; placeholder?: string }[] = [
  { key: 'fullName', label: 'Full name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+48 …' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/…' },
  { key: 'github', label: 'GitHub', placeholder: 'github.com/…' },
  { key: 'portfolio', label: 'Portfolio / website' },
]

// Contact details go straight onto the resume as typed — never through
// the LLM — so they're edited here rather than in the interview.
export default function ContactForm({ initial, onSave }: { initial: ContactInfo; onSave: (c: ContactInfo) => Promise<void> }) {
  const [contact, setContact] = useState<ContactInfo>(initial)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('saving')
    try {
      await onSave(contact)
      setState('saved')
    } catch {
      setState('error')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid sm:grid-cols-2 gap-3">
        {FIELDS.map(f => (
          <label key={f.key} className="text-sm">
            <span className="block text-xs font-medium text-gray-500 mb-1">{f.label}</span>
            <input
              type={f.type ?? 'text'}
              value={contact[f.key]}
              placeholder={f.placeholder}
              onChange={e => {
                setContact({ ...contact, [f.key]: e.target.value })
                setState('idle')
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={state === 'saving'}
          className="px-3 py-2 rounded-lg text-sm bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {state === 'saving' ? 'Saving…' : 'Save contact details'}
        </button>
        {state === 'saved' && <span className="text-sm text-green-700">Saved.</span>}
        {state === 'error' && <span className="text-sm text-red-700">Could not save. Try again.</span>}
      </div>
    </form>
  )
}
