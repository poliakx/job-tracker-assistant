import React from 'react'

type Props = {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  type?: 'button' | 'submit'
  variant?: 'default' | 'primary'
}

export default function Button({ children, onClick, className = '', type = 'button', variant = 'default' }: Props) {
  const base = 'px-3 py-2 rounded text-sm border'
  const variants: Record<string, string> = {
    default: base + ' bg-transparent border-gray-300 text-black hover:bg-gray-100',
    primary: base + ' bg-blue-800 text-white border-blue-800 hover:bg-blue-700',
  }

  return (
    <button type={type} onClick={onClick} className={variants[variant] + ' ' + className}>
      {children}
    </button>
  )
}
