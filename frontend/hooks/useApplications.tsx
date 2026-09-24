"use client"

import { useEffect, useMemo, useState } from 'react'
import { JobApplication, ApplicationStatus } from '@/types'
import { loadApplications, saveApplications } from '@/frontend/helpers/storage'
import { NO_ANSWER_AFTER_DAYS } from '@/frontend/helpers/constants'

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Applications still sitting in "applied" after a week with no update are
// auto-marked "no_answer" — run once whenever applications are loaded.
function applyAutoNoAnswer(apps: JobApplication[]) {
  const cutoff = Date.now() - NO_ANSWER_AFTER_DAYS * 24 * 60 * 60 * 1000
  const changed: JobApplication[] = []
  const next = apps.map(a => {
    if (a.status === 'applied' && new Date(a.appliedDate).getTime() < cutoff) {
      const updated = { ...a, status: 'no_answer' as ApplicationStatus }
      changed.push(updated)
      return updated
    }
    return a
  })
  return { next, changed }
}

export function useApplications() {
  const [applications, setApplications] = useState<JobApplication[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch('/api/applications')
        if (!res.ok) throw new Error('api error')
        const data = await res.json()
        const { next, changed } = applyAutoNoAnswer(data)
        if (mounted) setApplications(next)
        // persist auto no_answer transitions in the background; UI already has the new status
        changed.forEach(a => {
          fetch('/api/applications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: a.id, status: a.status }),
          }).catch(() => {})
        })
      } catch (e) {
        // fallback to localStorage when API is not available
        try {
          const apps = loadApplications()
          const { next, changed } = applyAutoNoAnswer(apps)
          if (changed.length) saveApplications(next)
          if (mounted) setApplications(next)
        } catch (err) {
          if (mounted) setApplications([])
        }
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  // no automatic save to localStorage; operations call server and fall back when needed

  async function addApplication(payload: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('api create failed')
      const created = await res.json()
      setApplications(prev => [created, ...prev].sort((a, b) => (b.appliedDate > a.appliedDate ? 1 : -1)))
    } catch (e) {
      // fallback to local storage
      const now = new Date().toISOString()
      const app: JobApplication = {
        ...payload,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      }
      setApplications(prev => {
        const next = [app, ...prev].sort((a, b) => (b.appliedDate > a.appliedDate ? 1 : -1))
        saveApplications(next)
        return next
      })
    }
  }

  async function updateApplication(id: string, patch: Partial<JobApplication>) {
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      })
      if (!res.ok) throw new Error('api update failed')
      const updated = await res.json()
      setApplications(prev => prev.map(a => (a.id === id ? updated : a)).sort((a, b) => (b.appliedDate > a.appliedDate ? 1 : -1)))
    } catch (e) {
      setApplications(prev => {
        const next = prev
          .map(a => (a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a))
          .sort((a, b) => (b.appliedDate > a.appliedDate ? 1 : -1))
        saveApplications(next)
        return next
      })
    }
  }

  async function deleteApplication(id: string) {
    try {
      const res = await fetch(`/api/applications?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('api delete failed')
      setApplications(prev => prev.filter(a => a.id !== id))
    } catch (e) {
      setApplications(prev => {
        const next = prev.filter(a => a.id !== id)
        saveApplications(next)
        return next
      })
    }
  }

  const stats = useMemo(() => {
    const total = applications.length
    const byStatus: Record<ApplicationStatus, number> = {
      applied: 0,
      interview: 0,
      technical_task: 0,
      offer: 0,
      no_answer: 0,
      rejected: 0,
    }
    applications.forEach(a => (byStatus[a.status] = (byStatus[a.status] || 0) + 1))
    return { total, byStatus }
  }, [applications])

  return {
    applications,
    addApplication,
    updateApplication,
    deleteApplication,
    stats,
  }
}
