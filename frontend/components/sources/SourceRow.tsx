"use client"
import React from 'react'
import type { SourceInfo } from '@/types'
import { SOURCE_ACCESS_LABEL, SOURCE_KIND_OPTIONS } from '@/frontend/helpers/constants'

function kindLabel(source: SourceInfo) {
  if (source.kind === 'code') return 'Built-in adapter'
  return SOURCE_KIND_OPTIONS.find(o => o.value === source.kind)?.label ?? source.kind
}

export default function SourceRow({
  source,
  busy,
  onToggle,
  onDelete,
}: {
  source: SourceInfo
  busy: boolean
  onToggle: (s: SourceInfo) => void
  onDelete: (s: SourceInfo) => void
}) {
  const active = source.enabled && !source.disabledByEnv

  return (
    <li className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900">{source.label}</span>
            <span
              className={
                'inline-flex items-center px-2 py-0.5 text-xs rounded-full border ' +
                (active ? 'bg-green-50 border-green-100 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-600')
              }
            >
              {source.disabledByEnv ? 'Off (DISABLED_SOURCES)' : active ? 'On' : 'Off'}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5 break-all">
            {kindLabel(source)}
            {source.identifier ? ` · ${source.identifier}` : ''}
          </div>
        </div>
        {source.id && (
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              disabled={busy}
              onClick={() => onToggle(source)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {source.enabled ? 'Turn off' : 'Turn on'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDelete(source)}
              className="px-3 py-1.5 rounded-lg border border-red-200 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <dl className="mt-3 grid gap-1 text-xs text-gray-600 sm:grid-cols-[auto_1fr] sm:gap-x-3">
        <dt className="text-gray-400">Access</dt>
        <dd>{SOURCE_ACCESS_LABEL[source.legal.access]}</dd>
        <dt className="text-gray-400">Terms</dt>
        <dd className="break-all">
          <a href={source.legal.termsUrl} target="_blank" rel="noreferrer noopener" className="text-blue-700">
            {source.legal.termsUrl}
          </a>
        </dd>
        <dt className="text-gray-400">Why allowed</dt>
        <dd className="whitespace-pre-line">{source.legal.termsNote}</dd>
        <dt className="text-gray-400">Checked</dt>
        <dd>{source.legal.reviewedAt}</dd>
      </dl>
    </li>
  )
}
