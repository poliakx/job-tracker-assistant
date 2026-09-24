"use client"
import React, { useState } from 'react'
import Input from '../ui/Input'

type Props = {
  onAdd: (payload: any) => void
}

// Fastest path to log an application: just company + position, Enter to save.
// Everything else gets sensible defaults and can be filled in later via Edit.
export default function QuickAddRow({ onAdd }: Props) {
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!company.trim() || !position.trim()) return
    onAdd({
      company: company.trim(),
      position: position.trim(),
      jobUrl: '',
      status: 'applied',
      source: 'other',
      appliedDate: new Date().toISOString().slice(0, 10),
      followUpDate: '',
      contactPerson: '',
      notes: '',
    })
    setCompany('')
    setPosition('')
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 mb-4">
      <div className="flex-1">
        <Input placeholder="Company" value={company} onChange={(e: any) => setCompany(e.target.value)} />
      </div>
      <div className="flex-1">
        <Input placeholder="Position" value={position} onChange={(e: any) => setPosition(e.target.value)} />
      </div>
      <button type="submit" className="px-4 py-2 border rounded bg-black text-white text-sm whitespace-nowrap">
        Add
      </button>
    </form>
  )
}
