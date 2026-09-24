import React from 'react'

export default function Card({ children, className = '' }: any) {
  return <div className={"bg-white border border-gray-100 rounded p-4 card-shadow " + className}>{children}</div>
}
