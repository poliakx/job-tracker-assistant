"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { timeAgo } from '@/frontend/helpers/timeAgo'
import type { EnglishAssessment, ResumeView } from '@/types'

function StatusBody({ dot, text, href, action }: { dot: string; text: React.ReactNode; href: string; action: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-600 flex gap-2 min-h-[2.5rem]">
        <span className={'mt-1.5 w-2 h-2 rounded-full shrink-0 ' + dot} />
        <span>{text}</span>
      </p>
      <Link
        href={href}
        className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50 hover:no-underline"
      >
        {action}
      </Link>
    </div>
  )
}

// undefined = still loading; null = failed or nothing there yet.
function useFetched<T>(url: string): T | null | undefined {
  const [data, setData] = useState<T | null | undefined>(undefined)
  useEffect(() => {
    fetch(url)
      .then(res => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => setData(null))
  }, [url])
  return data
}

export function ResumeStatus() {
  const view = useFetched<ResumeView>('/api/resume')
  if (view === undefined) return <p className="text-sm text-gray-400 min-h-[2.5rem]">Loading…</p>
  const resume = view?.resume
  if (!resume) {
    return <StatusBody dot="bg-gray-300" text="No resume yet — generate one from your profile." href="/resume" action="Create resume" />
  }
  return (
    <StatusBody
      dot={view.unsupportedSkills.length ? 'bg-amber-500' : 'bg-green-600'}
      text={
        view.unsupportedSkills.length
          ? `Updated ${timeAgo(resume.updatedAt)} · lists skills your profile doesn't mention — check it.`
          : `Updated ${timeAgo(resume.updatedAt)}. Regenerate after profile changes.`
      }
      href="/resume"
      action="Open resume"
    />
  )
}

export function EnglishStatus() {
  const history = useFetched<EnglishAssessment[]>('/api/english')
  if (history === undefined) return <p className="text-sm text-gray-400 min-h-[2.5rem]">Loading…</p>
  const latest = history?.[0]
  if (!latest) {
    return (
      <StatusBody
        dot="bg-gray-300"
        text="Not measured yet — matches use your self-stated level until you take the test."
        href="/english"
        action="Take the test"
      />
    )
  }
  return (
    <StatusBody
      dot="bg-green-600"
      text={
        <>
          <span className="font-semibold text-gray-900">{latest.overallLevel}</span> · measured {timeAgo(latest.createdAt)}
        </>
      }
      href="/english"
      action="See details"
    />
  )
}
