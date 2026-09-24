import React from 'react'
import Card from '../ui/Card'

export default function StatsCards({ stats }: any) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-4">
      <Card className="text-center">
        <div className="text-sm text-gray-500">Total</div>
        <div className="text-2xl font-semibold">{stats.total}</div>
      </Card>
      <Card className="text-center">
        <div className="text-sm text-gray-500">Applied</div>
        <div className="text-lg">{stats.byStatus.applied}</div>
      </Card>
      <Card className="text-center">
        <div className="text-sm text-gray-500">Interview</div>
        <div className="text-lg">{stats.byStatus.interview}</div>
      </Card>
      <Card className="text-center">
        <div className="text-sm text-gray-500">Task</div>
        <div className="text-lg">{stats.byStatus.technical_task}</div>
      </Card>
      <Card className="text-center">
        <div className="text-sm text-gray-500">Offer</div>
        <div className="text-lg">{stats.byStatus.offer}</div>
      </Card>
      <Card className="text-center">
        <div className="text-sm text-gray-500">No answer</div>
        <div className="text-lg">{stats.byStatus.no_answer}</div>
      </Card>
    </div>
  )
}
