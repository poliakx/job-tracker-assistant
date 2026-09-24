import React from 'react'
import { ApplicationStatus } from '@/types'
import { STATUS_LABEL } from '@/frontend/helpers/constants'

// Shared status -> color mapping, also used by StatusSelect so the inline
// picker looks like the same badge it replaces.
export const STATUS_COLOR: Record<string, string> = {
  applied: 'bg-gray-50 border-gray-200 text-gray-800',
  interview: 'bg-blue-50 border-blue-100 text-blue-800',
  technical_task: 'bg-amber-50 border-amber-100 text-amber-800',
  offer: 'bg-green-50 border-green-100 text-green-800',
  no_answer: 'bg-slate-100 border-slate-200 text-slate-600',
  rejected: 'bg-red-50 border-red-100 text-red-800',
  default: 'bg-gray-50 border-gray-200 text-gray-800',
}

export default function Badge({ children, status }: { children?: React.ReactNode; status?: ApplicationStatus }) {
  const base = 'inline-flex items-center px-2 py-0.5 text-xs rounded-full border'
  const label = typeof children === 'string' ? children : status ? STATUS_LABEL[status] || status : children
  const cls = status ? STATUS_COLOR[status] || STATUS_COLOR.default : STATUS_COLOR.default
  return <span className={base + ' ' + cls}>{label}</span>
}
