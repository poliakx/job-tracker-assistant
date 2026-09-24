import React from 'react'

export default function EmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-600 mb-4">No applications yet.</p>
      <div className="flex items-center justify-center gap-2">
        <button onClick={onAdd} className="px-4 py-2 border rounded text-sm border-gray-300">Add application</button>
      </div>
    </div>
  )
}
