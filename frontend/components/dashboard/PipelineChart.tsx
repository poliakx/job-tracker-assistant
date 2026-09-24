import React from 'react'
import { ApplicationStatus } from '@/types'
import { STATUS_OPTIONS } from '@/frontend/helpers/constants'
import { EmptyNote } from './Panel'

// Horizontal bars, one per status, all in the accent hue: the job here is
// comparing magnitudes, so length carries the meaning and colour doesn't
// need to. Each row is labelled directly, so there's no legend.
export default function PipelineChart({ byStatus, total }: { byStatus: Record<ApplicationStatus, number>; total: number }) {
  if (total === 0) return <EmptyNote>No applications yet — promote a vacancy or add one by hand.</EmptyNote>

  const max = Math.max(...STATUS_OPTIONS.map(o => byStatus[o.value]))

  return (
    <ul className="space-y-2.5">
      {STATUS_OPTIONS.map(o => {
        const count = byStatus[o.value]
        const share = Math.round((count / total) * 100)
        return (
          <li key={o.value} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3 text-sm" title={`${o.label}: ${count} (${share}%)`}>
            <span className="text-gray-600 truncate">{o.label}</span>
            <span className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <span
                className="block h-full rounded-full bg-blue-600 transition-[width] duration-500"
                style={{ width: max ? `${(count / max) * 100}%` : 0 }}
              />
            </span>
            <span className="text-right tabular-nums">
              <span className="font-medium text-gray-900">{count}</span>
              <span className="text-gray-400 text-xs ml-1">{share}%</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
