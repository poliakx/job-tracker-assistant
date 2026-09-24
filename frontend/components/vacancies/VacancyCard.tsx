"use client"
import React, { useState } from 'react'
import { Vacancy } from '@/types'
import { asDeepAnalysis, asTriageOnlyReason } from '@/frontend/helpers/vacancyAnalysis'
import { timeAgo } from '@/frontend/helpers/timeAgo'

const VERDICT_COLOR: Record<string, string> = {
  STRONG: 'bg-green-50 text-green-800 ring-green-200',
  MAYBE: 'bg-amber-50 text-amber-800 ring-amber-200',
  WEAK: 'bg-gray-50 text-gray-600 ring-gray-200',
}

// The score is the first thing scanned in the list, so it gets its own
// fixed-width column, tinted by verdict.
function ScoreChip({ verdict, fitScore }: { verdict?: string; fitScore?: number }) {
  const cls = verdict ? VERDICT_COLOR[verdict] || VERDICT_COLOR.WEAK : 'bg-white text-gray-400 ring-gray-200'
  return (
    <span className={'w-11 h-11 shrink-0 rounded-lg ring-1 grid place-items-center text-sm font-semibold ' + cls}>
      {typeof fitScore === 'number' ? fitScore : '–'}
    </span>
  )
}

function SkillChips({ label, skills, tone }: { label: string; skills: string[]; tone: 'match' | 'miss' | 'flag' }) {
  if (skills.length === 0) return null
  const chip = {
    match: 'bg-green-50 text-green-800',
    miss: 'bg-gray-100 text-gray-700',
    flag: 'bg-red-50 text-red-800',
  }[tone]
  return (
    <div className="mt-3">
      <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {skills.map(s => (
          <span key={s} className={'px-2 py-0.5 rounded text-xs ' + chip}>
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function VacancyCard({
  vacancy,
  fresh,
  onShortlist,
  onDismiss,
  onPromote,
}: {
  vacancy: Vacancy
  // Found by the most recent search — marked with a dot.
  fresh: boolean
  onShortlist: (v: Vacancy) => void
  onDismiss: (v: Vacancy) => void
  onPromote: (v: Vacancy) => void
}) {
  const [open, setOpen] = useState(false)
  const deep = asDeepAnalysis(vacancy.analysis)
  const triageReason = asTriageOnlyReason(vacancy.analysis)
  const dismissedWhy = vacancy.status === 'DISMISSED' ? vacancy.filterReasons?.[0] ?? triageReason : null
  const meta = [vacancy.company, vacancy.location, vacancy.remote ? 'remote' : null, timeAgo(vacancy.fetchedAt)].filter(Boolean)

  return (
    <li className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
      >
        <ScoreChip verdict={deep?.verdict} fitScore={vacancy.fitScore} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {fresh && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Found in the latest search" />}
            <span className="font-medium text-gray-900 truncate">{vacancy.title}</span>
          </div>
          <div className="text-sm text-gray-500 truncate">{meta.join(' · ')}</div>
        </div>
        <svg
          viewBox="0 0 24 24"
          className={'w-4 h-4 text-gray-400 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 sm:pl-[4.75rem]">
          {deep && <p className="text-sm text-gray-800">{deep.summary}</p>}
          {!deep && triageReason && <p className="text-sm text-gray-500 italic">Triaged out: {triageReason}</p>}
          {!deep && !triageReason && <p className="text-sm text-gray-400 italic">Not analyzed yet.</p>}
          {dismissedWhy && !deep && <p className="text-xs text-gray-500 mt-2">Why dismissed: {dismissedWhy}</p>}

          {deep && (
            <>
              <SkillChips label="Matched" skills={deep.matchedSkills} tone="match" />
              <SkillChips label="Missing" skills={deep.missingSkills} tone="miss" />
              <SkillChips label="Red flags" skills={deep.redFlags} tone="flag" />
              {vacancy.suggestedResume && (
                <p className="text-xs text-gray-600 mt-3">
                  <span className="font-medium">Resume:</span> {vacancy.suggestedResume}
                  {deep.suggestedResumeReason ? ` — ${deep.suggestedResumeReason}` : ''}
                </p>
              )}
              {deep.applyAdvice && (
                <p className="text-xs text-gray-600 mt-1">
                  <span className="font-medium">Advice:</span> {deep.applyAdvice}
                </p>
              )}
            </>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {vacancy.status !== 'APPLIED' && (
              <button
                onClick={() => onPromote(vacancy)}
                className="text-sm px-3 py-1.5 rounded-lg bg-blue-700 text-white hover:bg-blue-800"
              >
                Add to applications
              </button>
            )}
            {vacancy.status !== 'SHORTLISTED' && vacancy.status !== 'APPLIED' && (
              <button onClick={() => onShortlist(vacancy)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                Shortlist
              </button>
            )}
            {vacancy.status !== 'DISMISSED' && vacancy.status !== 'APPLIED' && (
              <button onClick={() => onDismiss(vacancy)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                Dismiss
              </button>
            )}
            <a
              href={vacancy.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Open posting ↗
            </a>
          </div>
        </div>
      )}
    </li>
  )
}
