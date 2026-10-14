import React from 'react'
import { VacancySummary as Vacancy } from '@/types'
import { asDeepAnalysis } from '@/frontend/helpers/vacancyAnalysis'
import { EmptyNote } from './Panel'

const VERDICT_TONE: Record<string, string> = {
  STRONG: 'bg-green-50 text-green-800 ring-green-200',
  MAYBE: 'bg-amber-50 text-amber-800 ring-amber-200',
  WEAK: 'bg-gray-50 text-gray-600 ring-gray-200',
}

// Best-scoring vacancies still waiting on a decision (new or shortlisted).
export default function TopMatches({ vacancies }: { vacancies: Vacancy[] }) {
  if (vacancies.length === 0) return <EmptyNote>Nothing waiting for review — run a search.</EmptyNote>

  return (
    <ul className="-mx-2">
      {vacancies.map(v => {
        const verdict = asDeepAnalysis(v.analysis)?.verdict
        const tone = verdict ? VERDICT_TONE[verdict] : 'bg-white text-gray-400 ring-gray-200'
        return (
          <li key={v.id}>
            <a
              href={v.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 hover:no-underline"
            >
              <span className={'w-9 h-9 shrink-0 rounded-lg ring-1 grid place-items-center text-xs font-semibold tabular-nums ' + tone}>
                {typeof v.fitScore === 'number' ? v.fitScore : '–'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-gray-900 truncate">{v.title}</span>
                <span className="block text-xs text-gray-500 truncate">
                  {v.company}
                  {v.location && ` · ${v.location}`}
                  {v.status === 'SHORTLISTED' && ' · Shortlisted'}
                </span>
              </span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
