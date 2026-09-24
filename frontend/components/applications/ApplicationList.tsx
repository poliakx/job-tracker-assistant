"use client"
import React, { useMemo, useState } from 'react'
import { JobApplication } from '@/types'
import ApplicationRow from './ApplicationRow'
import EmptyState from './EmptyState'
import ApplicationCard from './ApplicationCard'
import { STATUS_OPTIONS, SOURCE_OPTIONS } from '@/frontend/helpers/constants'

// Does `dateStr`'s calendar day fall within the chosen preset range (local time)?
function matchesDateFilter(dateStr: string, filter: string) {
  if (!filter) return true
  const day = new Date(dateStr)
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  if (filter === 'today') return dayStart === todayStart

  const days = filter === '7' ? 7 : 30
  const cutoff = todayStart - (days - 1) * 24 * 60 * 60 * 1000
  return dayStart >= cutoff && dayStart <= todayStart
}

export default function ApplicationList({ applications, onEdit, onDelete, onAdd, onStatusChange }: any) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const filtered = useMemo(() => {
    return applications
      .filter((a: JobApplication) => {
        if (statusFilter && a.status !== statusFilter) return false
        if (sourceFilter && a.source !== sourceFilter) return false
        if (!matchesDateFilter(a.appliedDate, dateFilter)) return false
        if (!query) return true
        const q = query.toLowerCase()
        return a.company.toLowerCase().includes(q) || a.position.toLowerCase().includes(q)
      })
      .sort((a: JobApplication, b: JobApplication) => (b.appliedDate > a.appliedDate ? 1 : -1))
  }, [applications, query, statusFilter, sourceFilter, dateFilter])

  if (!applications || applications.length === 0) return <EmptyState onAdd={onAdd} />

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input placeholder="Search company or position" value={query} onChange={e => setQuery(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded">
          <option value="">All status</option>
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded">
          <option value="">All sources</option>
          {SOURCE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded">
          <option value="">All time</option>
          <option value="today">Today</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-sm text-gray-600 border-b">
              <th className="py-2">Company</th>
              <th>Job</th>
              <th>Status</th>
              <th>Applied</th>
              <th>Contact</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((app: JobApplication) => (
              <ApplicationRow key={app.id} app={app} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden">
        {filtered.map((app: JobApplication) => (
          <ApplicationCard key={app.id} app={app} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
        ))}
      </div>
    </div>
  )
}
