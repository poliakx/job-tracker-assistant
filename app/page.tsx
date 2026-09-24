"use client"
import React, { useMemo } from 'react'
import Link from 'next/link'
import { useApplications } from '@/frontend/hooks/useApplications'
import { useVacancies } from '@/frontend/hooks/useVacancies'
import { useSearch } from '@/frontend/hooks/useSearch'
import { timeAgo } from '@/frontend/helpers/timeAgo'
import Icon from '@/frontend/components/ui/Icon'
import Panel, { StatTile } from '@/frontend/components/dashboard/Panel'
import PipelineChart from '@/frontend/components/dashboard/PipelineChart'
import RecentApplications from '@/frontend/components/dashboard/RecentApplications'
import TopMatches from '@/frontend/components/dashboard/TopMatches'
import SearchStatus from '@/frontend/components/dashboard/SearchStatus'
import InterviewStatus from '@/frontend/components/dashboard/InterviewStatus'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Dashboard: KPIs up top, the application pipeline on the left, and the
// three things to act on next (matches, search, profile) on the right.
export default function DashboardPage() {
  const { applications, stats } = useApplications()
  const { vacancies, lastRun, loading, error, refresh } = useVacancies()
  const search = useSearch({ onFinished: refresh })
  const searching = search.running !== null

  const { byStatus, total } = stats
  const active = byStatus.applied + byStatus.interview + byStatus.technical_task
  const reachedInterview = byStatus.interview + byStatus.technical_task + byStatus.offer
  const interviewRate = total ? Math.round((reachedInterview / total) * 100) : 0

  const thisWeek = useMemo(() => {
    const cutoff = Date.now() - WEEK_MS
    return applications.filter(a => new Date(a.appliedDate).getTime() >= cutoff).length
  }, [applications])

  const toReview = vacancies.filter(v => v.status === 'NEW').length
  const topMatches = useMemo(
    () =>
      vacancies
        .filter(v => v.status === 'NEW' || v.status === 'SHORTLISTED')
        .sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1))
        .slice(0, 5),
    [vacancies]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Your job search at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/applications"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 hover:no-underline"
          >
            Add application
          </Link>
          <button
            onClick={() => search.run('all')}
            disabled={searching}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-700 text-sm font-medium text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
          >
            {searching ? (
              <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
            ) : (
              <Icon name="search" className="w-4 h-4" />
            )}
            {searching ? 'Searching…' : 'Run search'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Applications" value={total} hint={`${thisWeek} in the last 7 days`} />
        <StatTile label="Active" value={active} hint="Applied, interview or task" />
        <StatTile label="Interview rate" value={`${interviewRate}%`} hint={`${reachedInterview} reached interview or later`} />
        <StatTile
          label="To review"
          value={loading ? '—' : toReview}
          hint={lastRun ? `Last search ${timeAgo(lastRun.finishedAt ?? lastRun.startedAt)}` : 'No searches yet'}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Panel title="Application pipeline" description="Where every application currently stands" href="/applications">
            <PipelineChart byStatus={byStatus} total={total} />
          </Panel>
          <Panel title="Recent applications" href="/applications">
            <RecentApplications applications={applications.slice(0, 6)} />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Top matches" description="Highest fit scores awaiting a decision" href="/vacancies" linkLabel="Review">
            <TopMatches vacancies={topMatches} />
          </Panel>
          <Panel title="Vacancy search" href="/vacancies" linkLabel="Open">
            <SearchStatus
              lastRun={lastRun}
              sources={search.sources}
              running={search.running}
              result={search.result}
              error={search.error}
              onRun={search.run}
            />
          </Panel>
          <Panel title="Profile interview" href="/profile" linkLabel="Open">
            <InterviewStatus />
          </Panel>
        </div>
      </div>
    </div>
  )
}
