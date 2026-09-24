"use client"
import React from 'react'
import StatusSelect from './StatusSelect'
import { ApplicationStatus, JobApplication } from '@/types'

export default function ApplicationCard({
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
    <div className="border border-gray-100 rounded p-3 mb-3 card-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{app.company}</div>
          <div className="text-sm text-gray-600">{app.position}</div>
          <div className="text-xs text-gray-500 mt-1">Applied: {new Date(app.appliedDate).toLocaleDateString()}</div>
        </div>
        <div className="text-right">
          <div className="mb-2">
            <StatusSelect status={app.status} onChange={status => onStatusChange(app, status)} />
          </div>
          <div className="text-sm text-gray-500">{app.source}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {app.jobUrl && (
          <a href={app.jobUrl} target="_blank" rel="noreferrer" className="text-sm px-2 py-1 border rounded text-gray-700">
            Open
          </a>
        )}
        <button onClick={() => onEdit(app)} className="text-sm px-2 py-1 border rounded">Edit</button>
        <button onClick={() => onDelete(app)} className="text-sm px-2 py-1 border rounded">Delete</button>
      </div>
    </div>
  )
}
