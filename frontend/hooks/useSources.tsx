"use client"

import { useCallback, useEffect, useState } from 'react'
import type { SourceInfo, SourceKind, SourcesResponse } from '@/types'

export interface NewSource {
  kind: SourceKind
  identifier: string
  label: string
  termsUrl: string
  termsNote: string
  termsConfirmed: boolean
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null)
  return body && typeof body.error === 'string' ? body.error : fallback
}

export function useSources() {
  const [sources, setSources] = useState<SourceInfo[]>([])
  const [scrapingEnabled, setScrapingEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/sources')
      if (!res.ok) throw new Error(await errorMessage(res, 'Could not load sources.'))
      const data: SourcesResponse = await res.json()
      setSources(data.sources)
      setScrapingEnabled(data.scrapingEnabled)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load sources.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Throws with the server's reason (bad identifier, robots.txt, …) so the
  // form can show it next to the fields.
  async function add(source: NewSource) {
    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source),
    })
    if (!res.ok) throw new Error(await errorMessage(res, 'Could not add the source.'))
    await load()
  }

  async function setEnabled(id: string, enabled: boolean) {
    const res = await fetch(`/api/sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    if (!res.ok) throw new Error(await errorMessage(res, 'Could not update the source.'))
    await load()
  }

  async function remove(id: string) {
    const res = await fetch(`/api/sources/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(await errorMessage(res, 'Could not delete the source.'))
    await load()
  }

  return { sources, scrapingEnabled, loading, error, add, setEnabled, remove }
}
