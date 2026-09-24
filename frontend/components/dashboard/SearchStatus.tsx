import React from 'react'
import { PipelineRun, SearchSource, SearchSummary } from '@/types'
import { timeAgo } from '@/frontend/helpers/timeAgo'
import type { SearchTarget } from '@/frontend/hooks/useSearch'

// Last-run numbers plus one-click per-source runs. The "search everything"
// button lives in the page header as the dashboard's primary action.
export default function SearchStatus({
  lastRun,
  sources,
  running,
  result,
  error,
  onRun,
}: {
  lastRun: PipelineRun | null
  sources: SearchSource[]
  running: SearchTarget | null
  result: SearchSummary | null
  error: string | null
  onRun: (target: SearchTarget) => void
}) {
  const busy = running !== null
  const summary = result ?? lastRun

  return (
    <div>
      {summary ? (
        <dl className="grid grid-cols-3 divide-x divide-gray-100 rounded-lg border border-gray-100 text-center">
          <Figure label="Fetched" value={summary.fetched} />
          <Figure label="New" value={summary.newCount} />
          <Figure label="Analyzed" value={summary.analyzed} />
        </dl>
      ) : (
        <p className="text-sm text-gray-500">No searches yet.</p>
      )}

      <p className="text-xs text-gray-500 mt-2">
        {busy
          ? 'Searching — fetching, filtering and analyzing can take a minute…'
          : lastRun
            ? `Last run ${timeAgo(lastRun.finishedAt ?? lastRun.startedAt)}`
            : 'Run the first search from the button above.'}
      </p>
      {error && !busy && <p className="text-xs text-red-700 mt-1">{error}</p>}

      {sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {sources.map(s => (
            <button
              key={s.name}
              onClick={() => onRun(s.name)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200 text-xs text-gray-700 hover:border-blue-300 hover:text-blue-800 disabled:opacity-50"
            >
              {running === s.name && <span className="w-3 h-3 border-2 border-current border-r-transparent rounded-full animate-spin" />}
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="py-2">
      <dt className="text-[11px] text-gray-500">{label}</dt>
      <dd className="text-lg font-semibold text-gray-900 tabular-nums">{value}</dd>
    </div>
  )
}
