"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useVacancies } from '@/frontend/hooks/useVacancies'
import VacancyList from '@/frontend/components/vacancies/VacancyList'
import AddVacancyForm from '@/frontend/components/vacancies/AddVacancyForm'
import Icon from '@/frontend/components/ui/Icon'
import { Vacancy } from '@/types'

// Vacancies: paste one in, get an honest match score against the profile,
// what to close to raise it, and a tailored resume.
export default function VacanciesPage() {
  const { vacancies, lastRun, loading, error, shortlist, dismiss, promote, create, analyze } = useVacancies()
  const [adding, setAdding] = useState(false)
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(t)
  }, [notice])

  function guard(action: Promise<unknown>, failText: string) {
    action.catch(() => setNotice({ text: failText, tone: 'error' }))
  }

  async function runAnalysis(v: Vacancy) {
    setAnalyzingIds(prev => new Set(prev).add(v.id))
    try {
      await analyze(v.id)
    } catch (e) {
      setNotice({ text: `Could not analyze "${v.title}". Try Re-analyze.`, tone: 'error' })
    } finally {
      setAnalyzingIds(prev => {
        const next = new Set(prev)
        next.delete(v.id)
        return next
      })
    }
  }

  async function handleAdd(text: string) {
    const vacancy = await create(text)
    setAdding(false)
    void runAnalysis(vacancy)
  }

  async function handlePromote(v: Vacancy) {
    try {
      const result = await promote(v.id)
      if (!result.alreadyPromoted) setNotice({ text: `Added to applications: ${v.company} — ${v.title}`, tone: 'ok' })
    } catch (e) {
      setNotice({ text: 'Could not add this vacancy to applications. Try again.', tone: 'error' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Vacancies</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/sources"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 no-underline hover:no-underline hover:bg-gray-50"
          >
            <Icon name="rss" className="w-4 h-4" />
            Sources
          </Link>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-700 text-sm font-medium text-white shadow-sm hover:bg-blue-800"
            >
              <Icon name="plus" className="w-4 h-4" />
              Add vacancy
            </button>
          )}
        </div>
      </div>

      {adding && (
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900">Add a vacancy</h2>
          <p className="text-xs text-gray-500 mt-0.5 mb-4">
            You&rsquo;ll get a match score against your profile, what to close to raise it, and a resume tailored to it.
          </p>
          <AddVacancyForm onSubmit={handleAdd} onCancel={() => setAdding(false)} />
        </section>
      )}

      {loading && vacancies.length === 0 && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {!error && (!loading || vacancies.length > 0) && (
        <VacancyList
          vacancies={vacancies}
          lastRun={lastRun}
          analyzingIds={analyzingIds}
          onShortlist={v => guard(shortlist(v.id), 'Could not shortlist this vacancy.')}
          onDismiss={v => guard(dismiss(v.id), 'Could not dismiss this vacancy.')}
          onPromote={handlePromote}
          onAnalyze={v => void runAnalysis(v)}
        />
      )}

      {notice && (
        <div
          role="status"
          className={
            'fixed left-1/2 -translate-x-1/2 bottom-20 md:bottom-6 z-50 px-4 py-2 rounded-lg text-sm shadow-lg ' +
            (notice.tone === 'ok' ? 'bg-gray-900 text-white' : 'bg-red-700 text-white')
          }
        >
          {notice.text}
        </div>
      )}
    </div>
  )
}
