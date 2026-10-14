"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon, { IconName } from '@/frontend/components/ui/Icon'

// desktopOnly: kept out of the mobile tab bar, which has room for six;
// /sources and /vacancies/check are linked from the Vacancies page there instead.
const ITEMS: { href: string; label: string; icon: IconName; desktopOnly?: boolean }[] = [
  { href: '/', label: 'Dashboard', icon: 'home' },
  { href: '/vacancies', label: 'Vacancies', icon: 'search' },
  { href: '/vacancies/check', label: 'Check vacancy', icon: 'plus', desktopOnly: true },
  { href: '/applications', label: 'Applications', icon: 'list' },
  { href: '/resume', label: 'Resume', icon: 'file' },
  { href: '/english', label: 'English', icon: 'globe' },
  { href: '/profile', label: 'Profile', icon: 'user' },
  { href: '/sources', label: 'Sources', icon: 'rss', desktopOnly: true },
]

const MOBILE_ITEMS = ITEMS.filter(item => !item.desktopOnly)

function matches(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
}

// Only the most specific matching item is active, so /vacancies/check
// doesn't also light up Vacancies on desktop. On mobile, where Check isn't
// in the bar, Vacancies stays highlighted.
// Clears the session cookie (only meaningful when APP_PASSWORD is set —
// see middleware.ts), then a full reload so the middleware sends us to /login.
async function signOut() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  window.location.assign('/login')
}

function isActive(pathname: string, href: string, items = ITEMS) {
  if (!matches(pathname, href)) return false
  return !items.some(other => other.href.length > href.length && matches(pathname, other.href))
}

// Sidebar on desktop, bottom tab bar on mobile (the app is a PWA, so the
// thumb-reachable bottom bar matters more than a hamburger menu).
export default function AppNav() {
  const pathname = usePathname() ?? '/'
  if (pathname === '/login') return null

  return (
    <>
      <aside className="hidden md:flex print:!hidden fixed inset-y-0 left-0 w-56 flex-col border-r border-gray-200 bg-white">
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-gray-100">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white grid place-items-center text-sm font-semibold shadow-sm">
            JT
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-gray-900">Job Tracker</div>
            <div className="text-[11px] text-gray-500">Profile, resume &amp; matches</div>
          </div>
        </div>
        <div className="px-5 pt-5 pb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">Menu</div>
        <nav className="px-3 flex flex-col gap-0.5">
          {ITEMS.map(item => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm no-underline hover:no-underline transition-colors ' +
                  (active ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')
                }
              >
                <span className={active ? 'text-blue-700' : 'text-gray-400'}>
                  <Icon name={item.icon} />
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto p-3 border-t border-gray-100">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </aside>

      <nav className="md:hidden print:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white grid grid-cols-6">
        {MOBILE_ITEMS.map(item => {
          const active = isActive(pathname, item.href, MOBILE_ITEMS)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                'flex flex-col items-center gap-0.5 py-2 text-[10px] no-underline hover:no-underline ' +
                (active ? 'text-blue-800 font-medium' : 'text-gray-500')
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
