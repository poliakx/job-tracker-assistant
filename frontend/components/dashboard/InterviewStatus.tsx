"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadInterviewDraft, type InterviewDraft } from '@/frontend/helpers/storage'

// The interview draft lives in localStorage, so it's read after mount —
// `undefined` means "not checked yet" and avoids a hydration mismatch.
export default function InterviewStatus() {
  const [draft, setDraft] = useState<InterviewDraft | null | undefined>(undefined)

  useEffect(() => {
    setDraft(loadInterviewDraft())
  }, [])

  const answers = draft?.messages.filter(m => m.role === 'user').length ?? 0
  const inReview = draft?.phase === 'review' || draft?.phase === 'extracting'
  const inProgress = !!draft && draft.messages.length > 0

  let text = 'A short AI interview builds the profile that search filtering and fit scores rely on.'
  let action = 'Start interview'
  let dot = 'bg-gray-300'
  if (inReview) {
    text = 'Interview finished — review the generated profile and save it.'
    action = 'Review profile'
    dot = 'bg-amber-500'
  } else if (inProgress) {
    text = `In progress · ${answers} answer${answers === 1 ? '' : 's'} so far.`
    action = 'Continue interview'
    dot = 'bg-blue-600'
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-600 flex gap-2 min-h-[2.5rem]">
        {draft !== undefined && <span className={'mt-1.5 w-2 h-2 rounded-full shrink-0 ' + dot} />}
        <span>{draft === undefined ? ' ' : text}</span>
      </p>
      <Link
        href="/profile"
        className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50 hover:no-underline"
      >
        {action}
      </Link>
    </div>
  )
}
