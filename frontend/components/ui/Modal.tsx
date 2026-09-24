"use client"
import React from 'react'

export default function Modal({ open, onClose, title, children }: any) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white max-w-xl w-full rounded shadow-lg card-shadow p-4 z-10">
        {title && <h3 className="text-lg font-medium mb-2">{title}</h3>}
        {children}
      </div>
    </div>
  )
}
