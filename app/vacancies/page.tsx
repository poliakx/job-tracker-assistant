"use client"
import React, { useEffect, useState } from 'react'
import { useVacancies } from '@/frontend/hooks/useVacancies'
import { useSearch } from '@/frontend/hooks/useSearch'
import SearchPanel from '@/frontend/components/search/SearchPanel'
import VacancyList from '@/frontend/components/vacancies/VacancyList'
import { Vacancy } from '@/types'

// Vacancies: run a search across the job boards, then triage what it found.
export default function VacanciesPage() {
  const { vacancies, lastRun, loading, error, shortlist, dismiss, promote, refresh } = useVacancies()
  const search = useSearch({ onFinished: refresh })
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(t)
  }, [notice])

  function guard(action: Promise<unknown>, failText: string) {
    action.catch(() => setNotice({ text: failText, tone: 'error' }))
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
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Vacancies</h1>

      <SearchPanel
        sources={search.sources}
        running={search.running}
        result={search.result}
        error={search.error}
        lastRun={lastRun}
        onRun={search.run}
      />

      {loading && vacancies.length === 0 && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {!error && (!loading || vacancies.length > 0) && (
        <VacancyList
          vacancies={vacancies}
          lastRun={lastRun}
          onShortlist={v => guard(shortlist(v.id), 'Could not shortlist this vacancy.')}
          onDismiss={v => guard(dismiss(v.id), 'Could not dismiss this vacancy.')}
          onPromote={handlePromote}
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
