import './globals.css'
import React from 'react'
import { Inter } from 'next/font/google'
import AppNav from '@/frontend/components/layout/AppNav'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata = {
  title: 'Job Tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>
        <AppNav />
        {/* pb-24 on mobile leaves room for the bottom tab bar */}
        <div className="md:pl-56 print:!pl-0 min-h-screen">
          <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-24 md:pb-8 print:p-0 print:max-w-none">{children}</main>
        </div>
      </body>
    </html>
  )
}
