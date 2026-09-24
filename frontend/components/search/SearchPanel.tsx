"use client"
import React from 'react'
import { PipelineRun, SearchSource, SearchSummary } from '@/types'
import { timeAgo } from '@/frontend/helpers/timeAgo'
import type { SearchTarget } from '@/frontend/hooks/useSearch'

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
}

function LastRunLine({ lastRun }: { lastRun: PipelineRun | null }) {
  if (!lastRun) return <>No searches yet — run the first one.</>
  const errors = Array.isArray(lastRun.errors) ? lastRun.errors.length : 0
  return (
    <>
      Last search {timeAgo(lastRun.finishedAt ?? lastRun.startedAt)} · {lastRun.fetched} fetched · {lastRun.newCount} new ·{' '}
      {lastRun.analyzed} analyzed
      {errors > 0 && <span className="text-red-700"> · {errors} error(s)</span>}
    </>
  )
}

export default function SearchPanel({
  sources,
  running,
  result,
  error,
  lastRun,
  onRun,
}: {
  sources: SearchSource[]
  running: SearchTarget | null
  result: SearchSummary | null
  error: string | null
  lastRun: PipelineRun | null
  onRun: (target: SearchTarget) => void
}) {
  const busy = running !== null

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900">Find new vacancies</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            <LastRunLine lastRun={lastRun} />
          </p>
        </div>
        <button
          onClick={() => onRun('all')}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-60 shrink-0"
        >
          {running === 'all' && <Spinner />}
          {running === 'all' ? 'Searching…' : 'Search all sources'}
        </button>
      </div>

      {sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-500 mr-1">Or one source:</span>
          {sources.map(s => (
            <button
              key={s.name}
              onClick={() => onRun(s.name)}
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-800 disabled:opacity-60"
            >
              {running === s.name && <Spinner />}
              {s.label}
            </button>
          ))}
        </div>
      )}

      {busy && (
        <p className="text-sm text-gray-500 mt-3">Fetching, filtering and analyzing — this can take a minute.</p>
      )}
      {result && !busy && (
        <p className="text-sm text-green-800 mt-3">
          Done: {result.fetched} fetched · {result.newCount} new · {result.analyzed} analyzed
          {result.errors > 0 && <span className="text-red-700"> · {result.errors} error(s)</span>}
        </p>
      )}
      {error && !busy && <p className="text-sm text-red-700 mt-3">{error}</p>}
    </section>
  )
}
