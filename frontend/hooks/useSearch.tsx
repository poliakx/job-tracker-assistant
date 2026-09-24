"use client"

import { useEffect, useState } from 'react'
import { SearchSource, SearchSummary } from '@/types'

// `running` is the source being searched, 'all' for every source, or null
// when idle — only one run at a time, so the buttons can all disable
// together.
export type SearchTarget = string | 'all'

export function useSearch({ onFinished }: { onFinished: () => void }) {
  const [sources, setSources] = useState<SearchSource[]>([])
  const [running, setRunning] = useState<SearchTarget | null>(null)
  const [result, setResult] = useState<SearchSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/search')
      .then(res => (res.ok ? res.json() : []))
      .then(setSources)
      .catch(() => setSources([]))
  }, [])

  async function run(target: SearchTarget) {
    if (running) return
    setRunning(target)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target === 'all' ? {} : { source: target }),
      })
      if (!res.ok) throw new Error('search failed')
      setResult(await res.json())
    } catch (e) {
      setError('Search failed. Check the server logs and try again.')
    } finally {
      setRunning(null)
      onFinished()
    }
  }

  return { sources, running, result, error, run }
}
