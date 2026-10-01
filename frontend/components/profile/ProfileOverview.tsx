import React from 'react'
import type { CandidateProfile } from '@/types'
import type { CompletenessItem } from '@/frontend/helpers/profileCompleteness'

const KIND_LABEL: Record<string, string> = {
  COMMERCIAL: 'Commercial',
  INTERNSHIP: 'Internship',
  FREELANCE: 'Freelance',
  VOLUNTEER: 'Volunteer',
  PERSONAL: 'Personal project',
  TEAM: 'Team project',
  ACADEMIC: 'Academic',
  OPEN_SOURCE: 'Open source',
  HACKATHON: 'Hackathon',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 first:mt-0">
      <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">{title}</h3>
      {children}
    </div>
  )
}

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-sm text-gray-400">—</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(i => (
        <span key={i} className="px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-700">
          {i}
        </span>
      ))}
    </div>
  )
}

function Kind({ kind }: { kind: string }) {
  return <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-50 text-[11px] text-blue-800 align-middle">{KIND_LABEL[kind] ?? kind}</span>
}

export function CompletenessList({ items }: { items: CompletenessItem[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map(i => (
        <li key={i.label} className="flex items-center gap-2 text-sm">
          <span className={'w-4 h-4 rounded-full grid place-items-center text-[10px] ' + (i.ok ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800')}>
            {i.ok ? '✓' : '!'}
          </span>
          <span className={i.ok ? 'text-gray-600' : 'text-gray-900'}>{i.label}</span>
          {!i.ok && <span className="text-xs text-gray-400">({i.fix === 'contact' ? 'contact form' : 'interview'})</span>}
        </li>
      ))}
    </ul>
  )
}

// Read-only view of the saved profile, laid out roughly like a resume so
// the owner can spot what's missing or wrong at a glance.
export default function ProfileOverview({ profile }: { profile: CandidateProfile }) {
  return (
    <div>
      <Section title="Headline">
        <p className="text-sm text-gray-900">{profile.headline || <span className="text-gray-400">—</span>}</p>
        {profile.about && <p className="text-sm text-gray-600 mt-1">{profile.about}</p>}
      </Section>

      <Section title="Stack">
        <div className="space-y-2">
          <div className="text-xs text-gray-500">Backend</div>
          <Chips items={profile.stack.backend} />
          <div className="text-xs text-gray-500">Frontend</div>
          <Chips items={profile.stack.frontend} />
          <div className="text-xs text-gray-500">Also knows</div>
          <Chips items={profile.stack.alsoKnows} />
        </div>
      </Section>

      <Section title="Work experience">
        {profile.workExperience.length === 0 && <p className="text-sm text-gray-400">None yet.</p>}
        <ul className="space-y-3">
          {profile.workExperience.map((w, i) => (
            <li key={i} className="text-sm">
              <div className="font-medium text-gray-900">
                {w.title} · {w.company}
                <Kind kind={w.kind} />
              </div>
              <div className="text-xs text-gray-500">{[w.startDate, w.endDate].filter(Boolean).join(' – ') || 'no dates'}</div>
              {w.description && <p className="text-gray-600 mt-0.5">{w.description}</p>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Projects">
        {profile.projects.length === 0 && <p className="text-sm text-gray-400">None yet.</p>}
        <ul className="space-y-3">
          {profile.projects.map((p, i) => (
            <li key={i} className="text-sm">
              <div className="font-medium text-gray-900">
                {p.name}
                <Kind kind={p.kind} />
              </div>
              {p.description && <p className="text-gray-600 mt-0.5">{p.description}</p>}
              {p.tech.length > 0 && <p className="text-xs text-gray-500 mt-0.5">{p.tech.join(' · ')}</p>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Education">
        {profile.education.length === 0 && <p className="text-sm text-gray-400">None yet.</p>}
        <ul className="space-y-1">
          {profile.education.map((e, i) => (
            <li key={i} className="text-sm text-gray-700">
              {[e.degree, e.field].filter(Boolean).join(', ')} — {e.institution}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Languages">
        <Chips items={profile.languageLevels.length ? profile.languageLevels.map(l => `${l.language} ${l.level}`) : profile.languages} />
      </Section>

      <Section title="Not interested in">
        <Chips items={profile.filterPolicy.conflictingStackKeywords} />
      </Section>
    </div>
  )
}
