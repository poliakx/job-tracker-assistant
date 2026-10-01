"use client"
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import ResumeDocument from './ResumeDocument'
import { timeAgo } from '@/frontend/helpers/timeAgo'
import type { ResumeView } from '@/types'

// Everything around the resume sheet: load/generate, warnings, "what was
// tailored", and Download PDF. Shared by the base resume (/resume) and the
// per-vacancy one (/resume/[vacancyId]) — only `apiPath` differs.
export default function ResumeWorkspace({ apiPath }: { apiPath: string }) {
  const [view, setView] = useState<ResumeView | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editable, setEditable] = useState(false)
  // Bumped on regenerate so on-page edits from the old version are dropped.
  const [version, setVersion] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiPath)
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setView(body)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the resume.')
    } finally {
      setLoading(false)
    }
  }, [apiPath])

  useEffect(() => {
    load()
  }, [load])

  async function generate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(apiPath, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setView(body)
      setVersion(v => v + 1)
      setEditable(false)
    } catch (e) {
      setError(`Could not generate the resume${e instanceof Error ? ` (${e.message})` : ''}. Try again.`)
    } finally {
      setGenerating(false)
    }
  }

  function downloadPdf() {
    // The browser uses the page title as the default PDF file name.
    const previous = document.title
    const name = view?.contact.fullName || 'Resume'
    document.title = view?.vacancy ? `${name} - CV - ${view.vacancy.company}` : `${name} - CV`
    setEditable(false)
    // Let React drop contentEditable before the print snapshot.
    setTimeout(() => {
      window.print()
      document.title = previous
    }, 50)
  }

  const resume = view?.resume ?? null
  const missingContact = view && (!view.contact.fullName || !view.contact.email)

  return (
    <div>
      <div className="print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              {view?.vacancy ? 'Tailored resume' : 'Resume'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {view?.vacancy ? (
                <>
                  For <span className="text-gray-800">{view.vacancy.title}</span> at {view.vacancy.company} ·{' '}
                  <Link href="/resume">base resume</Link>
                </>
              ) : (
                'Generated from your profile only — nothing is added that you did not say in the interview.'
              )}
              {resume && <> · updated {timeAgo(resume.updatedAt)}</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={generate}
              disabled={generating || loading}
              className="px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {generating ? 'Generating…' : resume ? 'Regenerate' : 'Generate'}
            </button>
            {resume && (
              <>
                <button
                  onClick={() => setEditable(e => !e)}
                  className={
                    'px-3.5 py-2 rounded-lg border text-sm font-medium shadow-sm ' +
                    (editable ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50')
                  }
                >
                  {editable ? 'Done editing' : 'Edit text'}
                </button>
                <button
                  onClick={downloadPdf}
                  className="px-3.5 py-2 rounded-lg bg-blue-700 text-sm font-medium text-white shadow-sm hover:bg-blue-800"
                >
                  Download PDF
                </button>
              </>
            )}
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">{error}</div>}

        {missingContact && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-4">
            Your name or email is missing — add them under <Link href="/profile">Profile → Contact details</Link>.
          </div>
        )}

        {view && view.unsupportedSkills.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-4">
            <span className="font-medium">Not found in your profile:</span> {view.unsupportedSkills.join(', ')}. Remove them
            with &ldquo;Edit text&rdquo; before sending — or, if you really have them, add them to your profile and
            regenerate.
          </div>
        )}

        {resume && resume.changes.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 mb-4">
            <div className="text-xs font-medium text-gray-500 mb-1">What was tailored</div>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
              {resume.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {editable && (
          <p className="text-xs text-gray-500 mb-2">
            Click any text on the page to change it. These edits are only for this printout — they are not saved, and
            Regenerate replaces them.
          </p>
        )}
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && view && !resume && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center print:hidden">
          <p className="text-sm text-gray-600 mb-4">
            {view.vacancy
              ? 'No tailored version for this vacancy yet.'
              : 'No resume yet. Make sure your profile is complete, then generate one.'}
          </p>
          <button
            onClick={generate}
            disabled={generating}
            className="px-4 py-2 rounded-lg bg-blue-700 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {generating ? 'Generating… (about 30 seconds)' : 'Generate resume'}
          </button>
        </div>
      )}

      {resume && view && <ResumeDocument key={version} content={resume.content} contact={view.contact} editable={editable} />}
    </div>
  )
}
