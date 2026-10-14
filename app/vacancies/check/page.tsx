"use client"
import React, { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useVacancyActions } from '@/frontend/hooks/useVacancyActions'
import AddVacancyForm from '@/frontend/components/vacancies/AddVacancyForm'
import NoticeToast from '@/frontend/components/vacancies/NoticeToast'
import CheckHistory from '@/frontend/components/vacancies/check/CheckHistory'
import AnalysisReport from '@/frontend/components/vacancies/check/AnalysisReport'

// Check a vacancy: paste one in, get an honest match score against the
// profile, what to close to raise it, and a tailored resume. Kept apart
// from the found-vacancies list. Past checks sit in the history sidebar on the right;
// the selected one is in the URL (?id=) so a report can be linked to.
function CheckVacancy() {
  const { vacancies, loading, error, create, runAnalysis, cardActions, notice } = useVacancyActions({ manual: true })
  const router = useRouter()
  const pathname = usePathname()
  const selectedId = useSearchParams()?.get('id') ?? null
  const selected = selectedId ? vacancies.find(v => v.id === selectedId) ?? null : null

  function select(id: string | null) {
    router.replace(id ? `${pathname}?id=${id}` : pathname ?? '/vacancies/check', { scroll: false })
  }

  async function handleAdd(text: string) {
    const vacancy = await create(text)
    select(vacancy.id)
    void runAnalysis(vacancy)
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/vacancies" className="text-sm text-gray-500 hover:text-gray-900 hover:no-underline">
          ← Vacancies
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mt-1">Check a vacancy</h1>
        <p className="text-sm text-gray-500 mt-1">
          Paste a posting to get a match score against your profile, what to close to raise it, and a resume tailored to it.
        </p>
      </div>

      {error && <p className="text-sm text-red-700 mb-4">{error}</p>}

      <div className="grid lg:grid-cols-[1fr_18rem] gap-6 items-start">
        <div className="order-2">
          {loading && vacancies.length === 0 ? (
            <p className="text-sm text-gray-500">Loading history…</p>
          ) : (
            <CheckHistory vacancies={vacancies} selectedId={selectedId} analyzingIds={cardActions.analyzingIds} onSelect={select} />
          )}
        </div>

        <div className="order-1 min-w-0">
          {selected ? (
            <AnalysisReport
              key={selected.id}
              vacancy={selected}
              analyzing={cardActions.analyzingIds.has(selected.id)}
              onShortlist={cardActions.onShortlist}
              onDismiss={cardActions.onDismiss}
              onPromote={cardActions.onPromote}
              onAnalyze={cardActions.onAnalyze}
            />
          ) : selectedId && loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              {selectedId && <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mb-4">That check no longer exists.</p>}
              <h2 className="text-sm font-semibold text-gray-900">New check</h2>
              <p className="text-xs text-gray-500 mt-0.5 mb-4">
                Paste the whole posting — title, company and link are picked out of it automatically.
              </p>
              <AddVacancyForm onSubmit={handleAdd} />
            </section>
          )}
        </div>
      </div>

      <NoticeToast notice={notice} />
    </div>
  )
}

// useSearchParams needs a Suspense boundary to keep the rest of the app
// statically renderable.
export default function CheckVacancyPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
      <CheckVacancy />
    </Suspense>
  )
}
