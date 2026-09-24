"use client"

import { useCallback, useEffect, useState } from 'react'
import { PipelineRun, Vacancy } from '@/types'

// Separate from useApplications on purpose (per PLAN.md): vacancies are
// pipeline-generated, not something the owner adds by hand, so there's no
// localStorage fallback here the way there is for applications — if the
// API is unreachable, that's a real error to show, not something to paper
// over with local state that would just be empty anyway.
export function useVacancies() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [lastRun, setLastRun] = useState<PipelineRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [vacanciesRes, runRes] = await Promise.all([fetch('/api/vacancies'), fetch('/api/pipeline-runs/latest')])
      if (!vacanciesRes.ok) throw new Error('failed to load vacancies')
      setVacancies(await vacanciesRes.json())
      setLastRun(runRes.ok ? await runRes.json() : null)
    } catch (e) {
      setError('Could not load vacancies — is the app connected to the database?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function updateVacancy(id: string, patch: Partial<Vacancy>) {
    const res = await fetch('/api/vacancies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    if (!res.ok) throw new Error('failed to update vacancy')
    const updated = await res.json()
    setVacancies(prev => prev.map(v => (v.id === id ? updated : v)))
    return updated
  }

  function shortlist(id: string) {
    return updateVacancy(id, { status: 'SHORTLISTED' })
  }

  function dismiss(id: string) {
    return updateVacancy(id, { status: 'DISMISSED' })
  }

  async function promote(id: string) {
    const res = await fetch(`/api/vacancies/${id}/promote`, { method: 'POST' })
    if (!res.ok) throw new Error('failed to promote vacancy')
    const body: { application: { id: string }; alreadyPromoted: boolean } = await res.json()
    setVacancies(prev => prev.map(v => (v.id === id ? { ...v, status: 'APPLIED', applicationId: body.application.id } : v)))
    return body
  }

  return { vacancies, lastRun, loading, error, shortlist, dismiss, promote, refresh: load }
}
