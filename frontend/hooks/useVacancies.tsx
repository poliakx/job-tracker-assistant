"use client"

import { useCallback, useEffect, useState } from 'react'
import { PipelineRun, Vacancy } from '@/types'

// Separate from useApplications on purpose (per docs/PLAN.md). No localStorage
// fallback here the way there is for applications: a vacancy is only
// useful with its server-side analysis, so if the API is unreachable
// that's a real error to show, not something to paper over.

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

  // Adds a vacancy from its pasted text (the server pulls out title,
  // company etc.). Doesn't analyze it — call analyze() next, so the card
  // shows up right away and the (slow) analysis runs visibly on it.
  async function create(text: string): Promise<Vacancy> {
    const res = await fetch('/api/vacancies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.details || body.error || 'failed to add vacancy')
    setVacancies(prev => [body, ...prev])
    return body
  }

  async function analyze(id: string): Promise<Vacancy> {
    const res = await fetch(`/api/vacancies/${id}/analyze`, { method: 'POST' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'failed to analyze vacancy')
    setVacancies(prev => prev.map(v => (v.id === id ? body : v)))
    return body
  }

  return { vacancies, lastRun, loading, error, shortlist, dismiss, promote, create, analyze, refresh: load }
}
