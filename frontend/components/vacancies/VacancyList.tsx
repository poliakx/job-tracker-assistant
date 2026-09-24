"use client"
import React, { useMemo, useState } from 'react'
import { PipelineRun, Vacancy, VacancyStatus } from '@/types'
import VacancyCard from './VacancyCard'

const TABS: { value: VacancyStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'DISMISSED', label: 'Dismissed' },
]

const EMPTY_TEXT: Record<VacancyStatus, string> = {
  NEW: 'No new vacancies. Run a search to look for more.',
  SHORTLISTED: 'Nothing shortlisted yet.',
  APPLIED: 'No vacancies added to applications yet.',
  DISMISSED: 'Nothing dismissed.',
}

export default function VacancyList({
  vacancies,
  lastRun,
  onShortlist,
  onDismiss,
  onPromote,
}: {
  vacancies: Vacancy[]
  lastRun: PipelineRun | null
  onShortlist: (v: Vacancy) => void
  onDismiss: (v: Vacancy) => void
  onPromote: (v: Vacancy) => void
}) {
  const [tab, setTab] = useState<VacancyStatus>('NEW')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const byStatus: Record<VacancyStatus, number> = { NEW: 0, SHORTLISTED: 0, DISMISSED: 0, APPLIED: 0 }
    vacancies.forEach(v => (byStatus[v.status] = (byStatus[v.status] || 0) + 1))
    return byStatus
  }, [vacancies])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return vacancies.filter(
      v => v.status === tab && (!q || v.title.toLowerCase().includes(q) || v.company.toLowerCase().includes(q))
    )
  }, [vacancies, tab, query])

  // "Fresh" = inserted during the latest run itself, not by e.g. a manual
  // `npm run ingest:once` afterwards.
  function isFresh(v: Vacancy) {
    if (!lastRun?.finishedAt) return false
    const created = new Date(v.createdAt).getTime()
    return created >= new Date(lastRun.startedAt).getTime() && created <= new Date(lastRun.finishedAt).getTime()
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={
                'text-sm px-3 py-1.5 rounded-md whitespace-nowrap ' +
                (tab === t.value ? 'bg-white text-gray-900 font-medium shadow-sm' : 'text-gray-600 hover:text-gray-900')
              }
            >
              {t.label} <span className="text-gray-400">{counts[t.value]}</span>
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Filter by title or company"
          className="sm:ml-auto w-full sm:w-64 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-16">{query ? 'No matches.' : EMPTY_TEXT[tab]}</p>
        ) : (
          <ul>
            {filtered.map(v => (
              <VacancyCard
                key={v.id}
                vacancy={v}
                fresh={isFresh(v)}
                onShortlist={onShortlist}
                onDismiss={onDismiss}
                onPromote={onPromote}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
