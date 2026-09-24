import React from 'react'

export default function Input(props: any) {
  return (
    <input
      className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-black text-sm"
      {...props}
    />
  )
}
