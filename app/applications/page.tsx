"use client"
import React, { useState } from 'react'
import { useApplications } from '@/frontend/hooks/useApplications'
import StatsCards from '@/frontend/components/applications/StatsCards'
import ApplicationList from '@/frontend/components/applications/ApplicationList'
import ApplicationForm from '@/frontend/components/applications/ApplicationForm'
import QuickAddRow from '@/frontend/components/applications/QuickAddRow'
import Card from '@/frontend/components/ui/Card'

export default function Page() {
  const { applications, addApplication, updateApplication, deleteApplication, stats } = useApplications()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  function handleAdd() {
    setEditing(null)
    setOpen(true)
  }

  function handleEdit(app: any) {
    setEditing(app)
    setOpen(true)
  }

  function handleDelete(app: any) {
    if (!confirm(`Delete application for ${app.company}?`)) return
    deleteApplication(app.id)
  }

  function handleSubmit(payload: any) {
    if (editing && editing.id) {
      updateApplication(editing.id, payload)
    } else {
      addApplication(payload)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Applications</h1>
        <button
          onClick={handleAdd}
          className="hidden md:inline-flex px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800"
        >
          Add application
        </button>
      </div>

      <StatsCards stats={stats} />

      <QuickAddRow onAdd={addApplication} />

      <Card>
        <ApplicationList
          applications={applications}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAdd={handleAdd}
          onStatusChange={(app: any, status: any) => updateApplication(app.id, { status })}
        />
      </Card>

      <ApplicationForm open={open} initial={editing} onClose={() => setOpen(false)} onSubmit={handleSubmit} />

      {/* Mobile floating add button */}
      <div className="md:hidden">
        <button onClick={handleAdd} className="mobile-add-btn bg-blue-800 text-white px-4 py-3">+</button>
      </div>
    </div>
  )
}
