"use client"
import React, { useEffect, useRef, useState } from 'react'
import type { InterviewMessage } from '@/frontend/helpers/storage'

export default function ChatStep({
  messages,
  sending,
  done,
  error,
  onSend,
  onRetry,
  onFinish,
}: {
  messages: InterviewMessage[]
  sending: boolean
  done: boolean
  error: string | null
  onSend: (text: string) => void
  onRetry: () => void
  onFinish: () => void
}) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    onSend(text)
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        A short screening chat with a &ldquo;recruiter&rdquo;. Answer the way you would in a real one — full sentences,
        with detail. Short answers give less to assess and usually mean a lower level.
      </p>
      <div className="max-h-[55vh] overflow-y-auto space-y-3 mb-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={
                'inline-block px-3 py-2 rounded text-sm max-w-[85%] whitespace-pre-wrap text-left ' +
                (m.role === 'user' ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-900')
              }
            >
              {m.content}
            </span>
          </div>
        ))}
        {sending && <p className="text-sm text-gray-400 italic">Typing…</p>}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="flex items-center gap-3 mb-2">
          <p className="text-sm text-red-700">{error}</p>
          {!sending && (
            <button onClick={onRetry} className="text-sm px-3 py-1 border border-red-200 rounded text-red-800 hover:bg-red-50 shrink-0">
              Retry
            </button>
          )}
        </div>
      )}

      {done ? (
        <button onClick={onFinish} className="px-4 py-2 rounded-lg bg-blue-700 text-sm font-medium text-white hover:bg-blue-800">
          Finish and get my level
        </button>
      ) : (
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onPaste={e => e.preventDefault()}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Type your answer in English…"
            rows={2}
            spellCheck={false}
            className="flex-1 px-3 py-2 border border-gray-200 rounded text-sm"
            disabled={sending}
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="px-3 py-2 border rounded text-sm bg-blue-800 text-white border-blue-800 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}
    </div>
  )
}
