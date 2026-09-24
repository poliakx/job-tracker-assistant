"use client"
import React from 'react'
import { ApplicationStatus } from '@/types'
import { STATUS_OPTIONS } from '@/frontend/helpers/constants'
import { STATUS_COLOR } from '../ui/Badge'

type Props = {
  status: ApplicationStatus
  onChange: (status: ApplicationStatus) => void
}

// Looks like the status badge but is an actual <select>, so status can be
// changed right from the list without opening the edit form.
export default function StatusSelect({ status, onChange }: Props) {
  return (
    <select
      value={status}
      onClick={e => e.stopPropagation()}
      onChange={e => onChange(e.target.value as ApplicationStatus)}
      className={`text-xs rounded-full border px-2 py-0.5 cursor-pointer ${STATUS_COLOR[status] || STATUS_COLOR.default}`}
    >
      {STATUS_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
