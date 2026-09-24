import React from 'react'
import { JobApplication } from '@/types'
import Badge from '@/frontend/components/ui/Badge'
import { EmptyNote } from './Panel'

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

export default function RecentApplications({ applications }: { applications: JobApplication[] }) {
  if (applications.length === 0) return <EmptyNote>Applications you add will show up here.</EmptyNote>

  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-y border-gray-100 bg-gray-50/60">
            <th className="font-medium px-5 py-2">Company</th>
            <th className="font-medium px-3 py-2 hidden sm:table-cell">Position</th>
            <th className="font-medium px-3 py-2">Status</th>
            <th className="font-medium px-5 py-2 text-right">Applied</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {applications.map(a => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="px-5 py-2.5">
                <div className="font-medium text-gray-900 truncate max-w-[12rem]">{a.company}</div>
                <div className="text-xs text-gray-500 truncate max-w-[12rem] sm:hidden">{a.position}</div>
              </td>
              <td className="px-3 py-2.5 text-gray-600 hidden sm:table-cell">
                <div className="truncate max-w-[16rem]">{a.position}</div>
              </td>
              <td className="px-3 py-2.5">
                <Badge status={a.status} />
              </td>
              <td className="px-5 py-2.5 text-right text-gray-500 tabular-nums whitespace-nowrap">
                {dateFmt.format(new Date(a.appliedDate))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
