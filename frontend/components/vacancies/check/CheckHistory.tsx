"use client"
import React, { useMemo, useState } from 'react'
import { VacancySummary as Vacancy } from '@/types'
import Icon from '@/frontend/components/ui/Icon'
import { asDeepAnalysis } from '@/frontend/helpers/vacancyAnalysis'
import { timeAgo } from '@/frontend/helpers/timeAgo'
import { STATUS_STYLE, VERDICT_STYLE } from './verdict'

// Every vacancy pasted in by hand, newest first. Picking one opens its
// report; "New check" goes back to the paste form.
export default function CheckHistory({
  vacancies,
  selectedId,
  analyzingIds,
  onSelect,
}: {
  vacancies: Vacancy[]
  selectedId: string | null
  analyzingIds: Set<string>
  onSelect: (id: string | null) => void
}) {
  const [query, setQuery] = useState('')

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase()
    return vacancies
      .filter(v => !q || v.title.toLowerCase().includes(q) || v.company.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [vacancies, query])

  return (
    <aside className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden lg:sticky lg:top-6">
      <div className="p-3 border-b border-gray-100 space-y-2">
        <button
          onClick={() => onSelect(null)}
          className={
            'w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ' +
            (selectedId === null ? 'bg-blue-700 text-white hover:bg-blue-800' : 'border border-gray-200 text-gray-800 hover:bg-gray-50')
          }
        >
          <Icon name="plus" className="w-4 h-4" />
          New check
        </button>
        {vacancies.length > 3 && (
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search history"
            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm"
          />
        )}
      </div>

      <div className="px-4 pt-3 pb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-gray-400">
        <span>History</span>
        <span>{vacancies.length}</span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500 text-center px-4 py-8">
          {query ? 'No matches.' : 'Nothing checked yet — your checks will be listed here.'}
        </p>
      ) : (
        <ul className="max-h-[32rem] lg:max-h-[calc(100vh-14rem)] overflow-y-auto pb-1">
          {sorted.map(v => {
            const deep = asDeepAnalysis(v.analysis)
            const analyzing = analyzingIds.has(v.id)
            const selected = v.id === selectedId
            const verdict = deep ? VERDICT_STYLE[deep.verdict] ?? VERDICT_STYLE.WEAK : null
            const status = STATUS_STYLE[v.status]
            return (
              <li key={v.id}>
                <button
                  onClick={() => onSelect(v.id)}
                  aria-current={selected ? 'true' : undefined}
                  className={
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left border-l-2 ' +
                    (selected ? 'bg-blue-50 border-blue-600' : 'border-transparent hover:bg-gray-50')
                  }
                >
                  <span
                    className={
                      'w-9 h-9 shrink-0 rounded-lg ring-1 grid place-items-center text-xs font-semibold ' +
                      (verdict ? verdict.chip : 'bg-white text-gray-400 ring-gray-200')
                    }
                  >
                    {analyzing ? (
                      <span className="w-3.5 h-3.5 border-2 border-blue-600 border-r-transparent rounded-full animate-spin" />
                    ) : typeof v.fitScore === 'number' ? (
                      v.fitScore
                    ) : (
                      '–'
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={'block text-sm truncate ' + (selected ? 'font-medium text-blue-900' : 'text-gray-900')}>
                      {v.title}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="truncate">{v.company}</span>
                      <span className="shrink-0">· {timeAgo(v.createdAt)}</span>
                    </span>
                  </span>
                  {v.status !== 'NEW' && (
                    <span className={'shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ' + status.cls}>{status.label}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
