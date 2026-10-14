"use client"

import { useEffect, useState } from 'react'
import { VacancySummary as Vacancy } from '@/types'
import { useVacancies } from './useVacancies'

export type Notice = { text: string; tone: 'ok' | 'error' }

// The card actions (analyze, promote, shortlist, dismiss) plus the toast
// they report through — shared by the found-vacancies list and the
// manual check page, which show the same cards.
export function useVacancyActions(filter: { manual: boolean }) {
  const vacancies = useVacancies(filter)
  const { shortlist, dismiss, promote, analyze } = vacancies
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<Notice | null>(null)

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

  async function handlePromote(v: Vacancy) {
    try {
      const result = await promote(v.id)
      if (!result.alreadyPromoted) setNotice({ text: `Added to applications: ${v.company} — ${v.title}`, tone: 'ok' })
    } catch (e) {
      setNotice({ text: 'Could not add this vacancy to applications. Try again.', tone: 'error' })
    }
  }

  const cardActions = {
    analyzingIds,
    onShortlist: (v: Vacancy) => guard(shortlist(v.id), 'Could not shortlist this vacancy.'),
    onDismiss: (v: Vacancy) => guard(dismiss(v.id), 'Could not dismiss this vacancy.'),
    onPromote: handlePromote,
    onAnalyze: (v: Vacancy) => void runAnalysis(v),
  }

  return { ...vacancies, cardActions, runAnalysis, notice }
}
