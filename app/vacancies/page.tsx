"use client"
import React from 'react'
import Link from 'next/link'
import { useVacancyActions } from '@/frontend/hooks/useVacancyActions'
import VacancyList from '@/frontend/components/vacancies/VacancyList'
import NoticeToast from '@/frontend/components/vacancies/NoticeToast'
import Icon from '@/frontend/components/ui/Icon'

// Vacancies found by the configured sources. Pasted-in ones live on
// /vacancies/check instead.
export default function VacanciesPage() {
  const { vacancies, lastRun, loading, error, cardActions, notice } = useVacancyActions({ manual: false })

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
          <Link
            href="/vacancies/check"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-700 text-sm font-medium text-white shadow-sm no-underline hover:no-underline hover:bg-blue-800"
          >
            <Icon name="plus" className="w-4 h-4" />
            Check a vacancy
          </Link>
        </div>
      </div>

      {loading && vacancies.length === 0 && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {!error && (!loading || vacancies.length > 0) && <VacancyList vacancies={vacancies} lastRun={lastRun} {...cardActions} />}

      <NoticeToast notice={notice} />
    </div>
  )
}
