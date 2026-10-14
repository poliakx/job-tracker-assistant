import React from 'react'
import type { Notice } from '@/frontend/hooks/useVacancyActions'

export default function NoticeToast({ notice }: { notice: Notice | null }) {
  if (!notice) return null
  return (
    <div
      role="status"
      className={
        'fixed left-1/2 -translate-x-1/2 bottom-20 md:bottom-6 z-50 px-4 py-2 rounded-lg text-sm shadow-lg ' +
        (notice.tone === 'ok' ? 'bg-gray-900 text-white' : 'bg-red-700 text-white')
      }
    >
      {notice.text}
    </div>
  )
}
