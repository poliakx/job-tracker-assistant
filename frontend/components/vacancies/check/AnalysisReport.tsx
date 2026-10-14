"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { Vacancy, VacancySummary } from '@/types'
import Panel from '@/frontend/components/dashboard/Panel'
import Icon, { IconName } from '@/frontend/components/ui/Icon'
import { asDeepAnalysis, asTriageOnlyReason, type DeepAnalysisView } from '@/frontend/helpers/vacancyAnalysis'
import { timeAgo } from '@/frontend/helpers/timeAgo'
import { STATUS_STYLE, VERDICT_STYLE } from './verdict'

type Gap = NonNullable<DeepAnalysisView['gaps']>[number]

const GAP_TYPE_LABEL: Record<Gap['type'], string> = {
  NOT_IN_PROFILE: 'Not in your profile',
  WEAK_EVIDENCE: 'Weak evidence',
  EXPERIENCE: 'Experience',
  LANGUAGE: 'Language',
  OTHER: 'Other',
}

const RESUME_LABEL: Record<string, string> = { FULLSTACK: 'Full-stack', BACKEND: 'Backend', FRONTEND: 'Frontend' }

// The fit score as a ring, so it reads at a glance before anything else.
function ScoreRing({ score, verdict }: { score?: number; verdict?: DeepAnalysisView['verdict'] }) {
  const value = typeof score === 'number' ? Math.max(0, Math.min(100, score)) : 0
  const r = 26
  const circumference = 2 * Math.PI * r
  const color = verdict ? (VERDICT_STYLE[verdict] ?? VERDICT_STYLE.WEAK).ring : 'text-gray-300'
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-gray-100" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          stroke="currentColor"
          className={color}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-lg font-semibold text-gray-900">
        {typeof score === 'number' ? score : '–'}
      </span>
    </div>
  )
}

function SkillColumn({
  title,
  icon,
  items,
  tone,
  empty,
}: {
  title: string
  icon: IconName
  items: string[]
  tone: 'match' | 'miss' | 'flag'
  empty: string
}) {
  const style = {
    match: { head: 'text-green-700', chip: 'bg-green-50 text-green-800' },
    miss: { head: 'text-gray-600', chip: 'bg-gray-100 text-gray-700' },
    flag: { head: 'text-red-700', chip: 'bg-red-50 text-red-800' },
  }[tone]
  return (
    <div>
      <div className={'flex items-center gap-1.5 text-xs font-semibold mb-2 ' + style.head}>
        <Icon name={icon} className="w-3.5 h-3.5" />
        {title}
        <span className="text-gray-400 font-normal">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map(s => (
            <span key={s} className={'px-2 py-0.5 rounded text-xs ' + style.chip}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function GapGroup({ title, gaps, tone }: { title: string; gaps: Gap[]; tone: 'must' | 'nice' }) {
  if (gaps.length === 0) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span
          className={
            'px-1.5 py-0.5 rounded text-[11px] font-medium ' + (tone === 'must' ? 'bg-red-50 text-red-800' : 'bg-gray-100 text-gray-600')
          }
        >
          {title}
        </span>
        <span className="text-xs text-gray-400">{gaps.length}</span>
      </div>
      <ol className="divide-y divide-gray-100 rounded-lg border border-gray-100">
        {gaps.map((g, i) => (
          <li key={i} className="flex gap-3 px-3 py-2.5">
            <span className="w-5 h-5 shrink-0 rounded-full bg-gray-100 text-[11px] font-medium text-gray-600 grid place-items-center mt-0.5">
              {i + 1}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-medium text-gray-900">{g.requirement}</span>
                <span className="text-[11px] text-gray-400">{GAP_TYPE_LABEL[g.type] ?? g.type}</span>
              </div>
              <p className="text-sm text-gray-700 mt-0.5">{g.action}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Recommendation({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3.5 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</div>
      <div className="text-sm font-medium text-gray-900 mt-1">{value}</div>
      {detail && <p className="text-xs text-gray-600 mt-1">{detail}</p>}
    </div>
  )
}

// The posting text isn't in the vacancy list (it's most of its size), so
// it's fetched the first time this is opened.
function OriginalPosting({ vacancyId }: { vacancyId: string }) {
  const [text, setText] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  async function load() {
    if (text !== null || state === 'loading') return
    setState('loading')
    try {
      const res = await fetch(`/api/vacancies/${encodeURIComponent(vacancyId)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const vacancy: Vacancy = await res.json()
      setText(vacancy.description)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  return (
    <details
      className="group bg-white rounded-xl border border-gray-200 shadow-sm"
      onToggle={e => {
        if ((e.currentTarget as HTMLDetailsElement).open) void load()
      }}
    >
      <summary className="cursor-pointer select-none px-5 py-3.5 text-sm font-semibold text-gray-900 flex items-center justify-between">
        Original posting
        <span className="text-xs font-normal text-gray-400 group-open:hidden">Show</span>
        <span className="text-xs font-normal text-gray-400 hidden group-open:inline">Hide</span>
      </summary>
      <div className="px-5 pb-5 text-sm text-gray-700 whitespace-pre-wrap max-h-[28rem] overflow-y-auto">
        {state === 'loading' && <span className="text-gray-400">Loading…</span>}
        {state === 'error' && (
          <span className="text-red-700">
            Could not load the posting.{' '}
            <button onClick={() => void load()} className="underline">
              Try again
            </button>
          </span>
        )}
        {text}
      </div>
    </details>
  )
}

const BTN = 'inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg hover:no-underline disabled:opacity-50 '
const BTN_SECONDARY = BTN + 'border border-gray-200 text-gray-800 hover:bg-gray-50'

// Full report for one checked vacancy: score and verdict up top, then the
// analysis split into summary, recommendations, skills and what to close.
export default function AnalysisReport({
  vacancy,
  analyzing,
  onShortlist,
  onDismiss,
  onPromote,
  onAnalyze,
}: {
  vacancy: VacancySummary
  analyzing: boolean
  onShortlist: (v: VacancySummary) => void
  onDismiss: (v: VacancySummary) => void
  onPromote: (v: VacancySummary) => void
  onAnalyze: (v: VacancySummary) => void
}) {
  const deep = analyzing ? null : asDeepAnalysis(vacancy.analysis)
  const triageReason = analyzing ? null : asTriageOnlyReason(vacancy.analysis)
  const verdict = deep ? VERDICT_STYLE[deep.verdict] ?? VERDICT_STYLE.WEAK : null
  const status = STATUS_STYLE[vacancy.status]
  const meta = [vacancy.company, vacancy.location, vacancy.remote ? 'Remote' : null].filter(Boolean)
  const gaps = deep?.gaps ?? []
  const mustHave = gaps.filter(g => g.importance === 'MUST_HAVE')
  const niceToHave = gaps.filter(g => g.importance !== 'MUST_HAVE')

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-start gap-4">
          {analyzing ? (
            <span className="w-16 h-16 shrink-0 rounded-full ring-[6px] ring-gray-100 grid place-items-center">
              <span className="w-5 h-5 border-2 border-blue-600 border-r-transparent rounded-full animate-spin" />
            </span>
          ) : (
            <ScoreRing score={vacancy.fitScore} verdict={deep?.verdict} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {verdict && <span className={'px-2 py-0.5 rounded-full ring-1 text-xs font-medium ' + verdict.chip}>{verdict.label}</span>}
              {vacancy.status !== 'NEW' && <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + status.cls}>{status.label}</span>}
              <span className="text-xs text-gray-400">Checked {timeAgo(vacancy.createdAt)}</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mt-1 leading-snug">{vacancy.title}</h2>
            <p className="text-sm text-gray-500">{meta.join(' · ')}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
          <Link
            href={`/resume/${vacancy.id}`}
            className={
              BTN + (deep?.tailoringRecommended ? 'bg-blue-700 text-white hover:bg-blue-800' : 'border border-gray-200 text-gray-800 hover:bg-gray-50')
            }
          >
            <Icon name="file" className="w-4 h-4" />
            Tailored resume
          </Link>
          {vacancy.status === 'APPLIED' ? (
            <span className={BTN + 'text-green-800 bg-green-50'}>
              <Icon name="check" className="w-4 h-4" />
              In applications
            </span>
          ) : (
            <button onClick={() => onPromote(vacancy)} className={BTN_SECONDARY}>
              <Icon name="list" className="w-4 h-4" />
              Add to applications
            </button>
          )}
          <button onClick={() => onAnalyze(vacancy)} disabled={analyzing} className={BTN_SECONDARY}>
            <Icon name="refresh" className="w-4 h-4" />
            {deep ? 'Re-analyze' : 'Analyze match'}
          </button>
          {vacancy.status === 'NEW' && (
            <>
              <button onClick={() => onShortlist(vacancy)} className={BTN_SECONDARY}>
                Shortlist
              </button>
              <button onClick={() => onDismiss(vacancy)} className={BTN_SECONDARY}>
                Dismiss
              </button>
            </>
          )}
          {vacancy.url && (
            <a href={vacancy.url} target="_blank" rel="noreferrer" className={BTN + 'text-gray-600 hover:bg-gray-50 sm:ml-auto'}>
              Open posting
              <Icon name="external" className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </section>

      {analyzing && (
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm text-gray-600">Analyzing the match against your profile… this takes about 20 seconds.</p>
          <div className="mt-4 space-y-2.5 animate-pulse">
            <div className="h-3 rounded bg-gray-100 w-11/12" />
            <div className="h-3 rounded bg-gray-100 w-9/12" />
            <div className="h-3 rounded bg-gray-100 w-10/12" />
          </div>
        </section>
      )}

      {!analyzing && !deep && (
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-sm">
          {triageReason ? (
            <p className="text-gray-700">
              <span className="font-medium">Triaged out:</span> {triageReason}
            </p>
          ) : (
            <p className="text-gray-500">Not analyzed yet — press Analyze match.</p>
          )}
        </section>
      )}

      {deep && (
        <>
          <Panel title="Summary">
            <p className="text-sm text-gray-800 leading-relaxed">{deep.summary}</p>
            <div className="grid sm:grid-cols-3 gap-3 mt-4">
              <Recommendation label="Should you apply?" value={deep.applyAdvice || '—'} />
              <Recommendation
                label="Resume to use"
                value={vacancy.suggestedResume ? RESUME_LABEL[vacancy.suggestedResume] ?? vacancy.suggestedResume : '—'}
                detail={deep.suggestedResumeReason}
              />
              <Recommendation
                label="Tailored resume"
                value={deep.tailoringReason ? (deep.tailoringRecommended ? 'Recommended' : 'Not needed') : '—'}
                detail={deep.tailoringReason}
              />
            </div>
          </Panel>

          <Panel title="Skills" description="Requirements from the posting, checked against your profile.">
            <div className="grid sm:grid-cols-3 gap-5">
              <SkillColumn title="Matched" icon="check" items={deep.matchedSkills} tone="match" empty="None matched." />
              <SkillColumn title="Missing" icon="plus" items={deep.missingSkills} tone="miss" empty="Nothing missing." />
              <SkillColumn title="Red flags" icon="alert" items={deep.redFlags} tone="flag" empty="No red flags." />
            </div>
          </Panel>

          {gaps.length > 0 && (
            <Panel title="To raise the match" description="What to close, most important first.">
              <div className="space-y-4">
                <GapGroup title="Must-have" gaps={mustHave} tone="must" />
                <GapGroup title="Nice to have" gaps={niceToHave} tone="nice" />
              </div>
              {gaps.some(g => g.type === 'NOT_IN_PROFILE') && (
                <p className="text-xs text-gray-500 mt-4 flex items-start gap-1.5">
                  <Icon name="arrowUp" className="w-3.5 h-3.5 mt-px shrink-0" />
                  <span>
                    Already have some of these? <Link href="/profile">Add them to your profile</Link>, then re-analyze.
                  </span>
                </p>
              )}
            </Panel>
          )}
        </>
      )}

      <OriginalPosting vacancyId={vacancy.id} />
    </div>
  )
}
