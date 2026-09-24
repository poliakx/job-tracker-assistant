"use client"
import React, { useEffect, useRef, useState } from 'react'
import Card from '@/frontend/components/ui/Card'
import { CandidateProfile } from '@/types'
import {
  clearInterviewDraft,
  loadInterviewDraft,
  saveInterviewDraft,
  type InterviewMessage as ChatMessage,
} from '@/frontend/helpers/storage'

type Phase = 'chat' | 'extracting' | 'review' | 'saving' | 'saved'

export default function ProfilePage() {
  const [phase, setPhase] = useState<Phase>('chat')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Which step the Retry button re-runs after a failure.
  const [retry, setRetry] = useState<'interview' | 'extract' | null>(null)
  const [profileJson, setProfileJson] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, phase])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const draft = loadInterviewDraft()
    if (!draft || draft.messages.length === 0) {
      void sendToInterviewer([])
      return
    }
    // Pick up where the owner left off instead of starting a new interview.
    setMessages(draft.messages)
    setProfileJson(draft.profileJson)
    if (draft.phase === 'extracting') {
      void runExtraction(draft.messages)
    } else {
      setPhase(draft.phase)
      if (draft.phase === 'chat' && draft.messages[draft.messages.length - 1].role === 'user') {
        setError('Your last answer never got a reply. Press Retry to send it again.')
        setRetry('interview')
      }
    }
    // Intentionally run once on mount only — startedRef already guards
    // against the double-invoke Strict Mode does in dev; adding
    // sendToInterviewer here would just be noise since it's a new
    // reference every render regardless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Autosave the draft after every change. Skipped while empty so the
  // initial render can't overwrite a stored draft before it's restored.
  useEffect(() => {
    if (phase === 'saved' || messages.length === 0) return
    const storedPhase = phase === 'saving' ? 'review' : phase
    saveInterviewDraft({ messages, phase: storedPhase, profileJson })
  }, [messages, phase, profileJson])

  async function sendToInterviewer(history: ChatMessage[]) {
    setSending(true)
    setError(null)
    setRetry(null)
    try {
      const res = await fetch('/api/profile/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data: { message: string; done: boolean } = await res.json()
      const next = [...history, { role: 'assistant' as const, content: data.message }]
      setMessages(next)
      if (data.done) {
        await runExtraction(next)
      }
    } catch (e) {
      const reason = e instanceof Error ? ` (${e.message})` : ''
      setError(`Something went wrong talking to the interviewer${reason}. Your answers are saved — press Retry.`)
      setRetry('interview')
    } finally {
      setSending(false)
    }
  }

  async function runExtraction(transcript: ChatMessage[]) {
    setPhase('extracting')
    setError(null)
    setRetry(null)
    try {
      const res = await fetch('/api/profile/interview/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: transcript }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const profile: CandidateProfile = await res.json()
      setProfileJson(JSON.stringify(profile, null, 2))
      setPhase('review')
    } catch (e) {
      const reason = e instanceof Error ? ` (${e.message})` : ''
      setError(`Could not build a profile from the interview${reason}. Press Retry, or add more detail below.`)
      setRetry('extract')
      setPhase('chat')
    }
  }

  function handleRetry() {
    if (retry === 'extract') void runExtraction(messages)
    else void sendToInterviewer(messages)
  }

  function handleStartOver() {
    if (!confirm('Start the interview from scratch? Your current answers will be discarded.')) return
    clearInterviewDraft()
    setMessages([])
    setProfileJson('')
    setInput('')
    setPhase('chat')
    void sendToInterviewer([])
  }

  function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    const next = [...messages, { role: 'user' as const, content: text }]
    setMessages(next)
    void sendToInterviewer(next)
  }

  async function handleSave() {
    let parsed: unknown
    try {
      parsed = JSON.parse(profileJson)
    } catch (e) {
      setError('That JSON is not valid — fix it before saving.')
      return
    }
    setPhase('saving')
    setError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.details || body.error || 'save failed')
      }
      clearInterviewDraft()
      setPhase('saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the profile.')
      setPhase('review')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Profile interview</h1>
        {phase !== 'saved' && messages.length > 1 && (
          <button onClick={handleStartOver} disabled={sending} className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50">
            Start over
          </button>
        )}
      </div>

      {(phase === 'chat' || phase === 'extracting') && (
        <Card>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 mb-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <span
                  className={
                    'inline-block px-3 py-2 rounded text-sm max-w-[85%] whitespace-pre-wrap ' +
                    (m.role === 'user' ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-900')
                  }
                >
                  {m.content}
                </span>
              </div>
            ))}
            {(sending || phase === 'extracting') && <p className="text-sm text-gray-400 italic">Thinking…</p>}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="flex items-center gap-3 mb-2">
              <p className="text-sm text-red-700">{error}</p>
              {retry && phase === 'chat' && !sending && (
                <button onClick={handleRetry} className="text-sm px-3 py-1 border border-red-200 rounded text-red-800 hover:bg-red-50 shrink-0">
                  Retry
                </button>
              )}
            </div>
          )}

          {phase === 'chat' && (
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Type your answer…"
                rows={2}
                className="flex-1 px-3 py-2 border border-gray-200 rounded text-sm"
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="px-3 py-2 border rounded text-sm bg-blue-800 text-white border-blue-800 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          )}
        </Card>
      )}

      {(phase === 'review' || phase === 'saving') && (
        <Card>
          <p className="text-sm text-gray-600 mb-2">
            Here&rsquo;s what the interview came away with. Check it over — especially the stack and the &ldquo;not
            known&rdquo; list — and edit the JSON directly if anything&rsquo;s off, then save.
          </p>
          <textarea
            value={profileJson}
            onChange={e => setProfileJson(e.target.value)}
            rows={22}
            className="w-full px-3 py-2 border border-gray-200 rounded text-xs font-mono"
            disabled={phase === 'saving'}
          />
          {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSave}
              disabled={phase === 'saving'}
              className="px-3 py-2 border rounded text-sm bg-blue-800 text-white border-blue-800 disabled:opacity-50"
            >
              {phase === 'saving' ? 'Saving…' : 'Save profile'}
            </button>
            <button
              onClick={() => {
                setPhase('chat')
                setError(null)
              }}
              className="px-3 py-2 border rounded text-sm"
            >
              Back to interview
            </button>
          </div>
        </Card>
      )}

      {phase === 'saved' && (
        <Card>
          <p className="text-sm text-gray-800 mb-3">
            Saved. The pipeline will use this profile from the next run — filter and analysis prompts included.
          </p>
          <a href="/" className="text-sm px-3 py-2 border rounded inline-block">
            Go to dashboard
          </a>
        </Card>
      )}
    </div>
  )
}
