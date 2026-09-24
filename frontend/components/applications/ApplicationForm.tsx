"use client"
import React, { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import { JobApplication } from '@/types'
import { STATUS_OPTIONS, SOURCE_OPTIONS } from '@/frontend/helpers/constants'

type Props = {
  open: boolean
  initial?: Partial<JobApplication>
  onClose: () => void
  onSubmit: (payload: any) => void
}

const defaultVals = {
  company: '',
  position: '',
  jobUrl: '',
  status: 'applied',
  source: 'other',
  appliedDate: new Date().toISOString().slice(0, 10),
  followUpDate: '',
  contactPerson: '',
  notes: '',
}

export default function ApplicationForm({ open, initial = {}, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<any>({ ...defaultVals })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setForm({ ...defaultVals, ...initial })
    setErrors({})
  }, [initial, open])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev: any) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function validate() {
    const err: Record<string, string> = {}
    if (!form.company) err.company = 'Required'
    if (!form.position) err.position = 'Required'
    if (!form.status) err.status = 'Required'
    if (!form.appliedDate) err.appliedDate = 'Required'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!validate()) return
    onSubmit(form)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Edit application' : 'Add application'}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-600">Company</label>
          <Input name="company" value={form.company} onChange={handleChange} />
          {errors.company && <div className="text-red-500 text-xs">{errors.company}</div>}
        </div>

        <div>
          <label className="block text-xs text-gray-600">Position</label>
          <Input name="position" value={form.position} onChange={handleChange} />
          {errors.position && <div className="text-red-500 text-xs">{errors.position}</div>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded">
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600">Applied date</label>
            <Input type="date" name="appliedDate" value={form.appliedDate} onChange={handleChange} />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-600">Source</label>
          <select name="source" value={form.source} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded">
            {SOURCE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600">Job URL</label>
          <Input name="jobUrl" value={form.jobUrl} onChange={handleChange} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600">Contact person</label>
            <Input name="contactPerson" value={form.contactPerson} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Follow-up date</label>
            <Input type="date" name="followUpDate" value={form.followUpDate} onChange={handleChange} />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-600">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded" />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 border rounded text-sm">Cancel</button>
          <button type="submit" className="px-3 py-2 border rounded text-sm bg-black text-white">Save</button>
        </div>
      </form>
    </Modal>
  )
}
