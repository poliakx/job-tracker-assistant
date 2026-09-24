import React from 'react'
import Link from 'next/link'

// The one surface every dashboard block sits on: title row with an optional
// "View all" link, then the body. Keeping it shared is what makes the
// dashboard read as one system instead of a set of unrelated boxes.
export default function Panel({
  title,
  description,
  href,
  linkLabel = 'View all',
  children,
  className = '',
}: {
  title: string
  description?: string
  href?: string
  linkLabel?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={'bg-white rounded-xl border border-gray-200 shadow-sm ' + className}>
      <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        {href && (
          <Link href={href} className="text-xs font-medium text-blue-700 hover:text-blue-900 hover:no-underline shrink-0">
            {linkLabel}
          </Link>
        )}
      </header>
      <div className="px-5 pb-5">{children}</div>
    </section>
  )
}

// KPI tile: label, one number, one line of context underneath.
export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500 truncate">{hint}</div>}
    </div>
  )
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500 py-6 text-center">{children}</p>
}
