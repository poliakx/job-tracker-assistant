"use client"
import React from 'react'
import StatusSelect from './StatusSelect'
import { ApplicationStatus, JobApplication } from '@/types'

export default function ApplicationRow({
  app,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  app: JobApplication
  onEdit: any
  onDelete: any
  onStatusChange: (app: JobApplication, status: ApplicationStatus) => void
}) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="py-3 pr-4 align-top">
        <div className="font-medium">{app.company}</div>
        <div className="text-sm text-gray-600">{app.position}</div>
      </td>
      <td className="py-3 align-top">
        <a href={app.jobUrl} target="_blank" rel="noreferrer" className="text-sm text-gray-600 underline">
          Link
        </a>
      </td>
      <td className="py-3 align-top">
        <StatusSelect status={app.status} onChange={status => onStatusChange(app, status)} />
      </td>
      <td className="py-3 align-top">{new Date(app.appliedDate).toLocaleDateString()}</td>
      <td className="py-3 align-top">{app.contactPerson || '-'}</td>
      <td className="py-3 align-top">
        <div className="flex gap-2">
          <button className="text-sm px-2 py-1 border rounded" onClick={() => onEdit(app)}>
            Edit
          </button>
          <button className="text-sm px-2 py-1 border rounded" onClick={() => onDelete(app)}>
            Delete
          </button>
        </div>
      </td>
    </tr>
  )
}
