"use client"
import React, { useState } from 'react'
import { useSources } from '@/frontend/hooks/useSources'
import AddSourceForm from '@/frontend/components/sources/AddSourceForm'
import SourceRow from '@/frontend/components/sources/SourceRow'
import Icon from '@/frontend/components/ui/Icon'
import type { SourceInfo } from '@/types'

// Job sources: where automated collection reads vacancies from, and the
// recorded reason each one may be read automatically.
export default function SourcesPage() {
  const { sources, scrapingEnabled, loading, error, add, setEnabled, remove } = useSources()
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function act(source: SourceInfo, action: () => Promise<void>) {
    setBusyId(source.id)
    setActionError(null)
    try {
      await action()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusyId(null)
    }
  }

  function handleDelete(source: SourceInfo) {
    if (!source.id) return
    if (!window.confirm(`Delete "${source.label}"? Vacancies it already found are kept.`)) return
    void act(source, () => remove(source.id!))
  }

  async function handleAdd(source: Parameters<typeof add>[0]) {
    await add(source)
    setAdding(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Sources</h1>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-700 text-sm font-medium text-white shadow-sm hover:bg-blue-800"
          >
            <Icon name="plus" className="w-4 h-4" />
            Add source
          </button>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-6 max-w-2xl">
        Job boards that automated collection reads. Only sources published for automated reading can be added — public job-board
        APIs, feeds and JobPosting data — and only after you&rsquo;ve checked their terms allow it.
      </p>

      {!scrapingEnabled && !loading && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Automated collection is off, so these sources aren&rsquo;t read. Set <code>SCRAPING_ENABLED=true</code> on the server to turn
          it on.
        </div>
      )}

      {adding && (
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Add a source</h2>
          <AddSourceForm onSubmit={handleAdd} onCancel={() => setAdding(false)} />
        </section>
      )}

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {actionError && <p className="text-sm text-red-700 mb-3">{actionError}</p>}

      {!loading && !error && sources.length === 0 && !adding && (
        <p className="text-sm text-gray-500">No sources yet. Add a company&rsquo;s job board or a job feed to get started.</p>
      )}

      {sources.length > 0 && (
        <ul className="space-y-3">
          {sources.map(s => (
            <SourceRow
              key={s.name}
              source={s}
              busy={busyId !== null && busyId === s.id}
              onToggle={src => void act(src, () => setEnabled(src.id!, !src.enabled))}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
