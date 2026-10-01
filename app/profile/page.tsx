"use client"
import React, { useEffect, useRef, useState } from 'react'
import Card from '@/frontend/components/ui/Card'
import Panel from '@/frontend/components/dashboard/Panel'
import ContactForm from '@/frontend/components/profile/ContactForm'
import ProfileOverview, { CompletenessList } from '@/frontend/components/profile/ProfileOverview'
import { profileCompleteness } from '@/frontend/helpers/profileCompleteness'
import { CandidateProfile, ContactInfo } from '@/types'
import {
  clearInterviewDraft,
  loadInterviewDraft,
  saveInterviewDraft,
  type InterviewMessage as ChatMessage,
} from '@/frontend/helpers/storage'

// 'loading' until we know whether there's a saved profile or a draft;
// 'overview' shows the saved profile; the rest are the interview flow.
type Phase = 'loading' | 'overview' | 'chat' | 'extracting' | 'review' | 'saving'
type Mode = 'new' | 'update'

async function putProfile(profile: unknown): Promise<CandidateProfile> {
  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.details || body.error || 'save failed')
  return body as CandidateProfile
}

export default function ProfilePage() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [mode, setMode] = useState<Mode>('new')
  const [saved, setSaved] = useState<CandidateProfile | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Which step the Retry button re-runs after a failure.
  const [retry, setRetry] = useState<'interview' | 'extract' | null>(null)
  const [profileJson, setProfileJson] = useState('')
  const [editingJson, setEditingJson] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, phase])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void init()
    // Intentionally run once on mount only — startedRef already guards
    // against the double-invoke Strict Mode does in dev.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function init() {
    let savedProfile: CandidateProfile | null = null
    try {
      const res = await fetch('/api/profile')
      if (res.ok) savedProfile = (await res.json()).profile
    } catch {
      // Treated as "nothing saved" — the interview still works.
    }
    setSaved(savedProfile)

    const draft = loadInterviewDraft()
    if (draft && draft.messages.length > 0) {
      // Pick up where the owner left off instead of starting a new interview.
      setMode(draft.mode)
      setMessages(draft.messages)
      setProfileJson(draft.profileJson)
      if (draft.phase === 'extracting') {
        void runExtraction(draft.messages, draft.mode)
      } else {
        setPhase(draft.phase)
        if (draft.phase === 'chat' && draft.messages[draft.messages.length - 1].role === 'user') {
          setError('Your last answer never got a reply. Press Retry to send it again.')
          setRetry('interview')
        }
      }
      return
    }

    if (savedProfile) setPhase('overview')
    else startInterview('new')
  }

  // Autosave the draft after every change. Skipped while empty so the
  // initial render can't overwrite a stored draft before it's restored.
  useEffect(() => {
    if (phase === 'loading' || phase === 'overview' || messages.length === 0) return
    const storedPhase = phase === 'saving' ? 'review' : phase
    saveInterviewDraft({ messages, phase: storedPhase, profileJson, mode })
  }, [messages, phase, profileJson, mode])

  function startInterview(nextMode: Mode) {
    clearInterviewDraft()
    setMode(nextMode)
    setMessages([])
    setProfileJson('')
    setInput('')
    setError(null)
    setPhase('chat')
    void sendToInterviewer([], nextMode)
  }

  async function sendToInterviewer(history: ChatMessage[], interviewMode: Mode = mode) {
    setSending(true)
    setError(null)
    setRetry(null)
    try {
      const res = await fetch('/api/profile/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, mode: interviewMode }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data: { message: string; done: boolean } = await res.json()
      const next = [...history, { role: 'assistant' as const, content: data.message }]
      setMessages(next)
      if (data.done) {
        await runExtraction(next, interviewMode)
      }
    } catch (e) {
      const reason = e instanceof Error ? ` (${e.message})` : ''
      setError(`Something went wrong talking to the interviewer${reason}. Your answers are saved — press Retry.`)
      setRetry('interview')
    } finally {
      setSending(false)
    }
  }

  async function runExtraction(transcript: ChatMessage[], interviewMode: Mode = mode) {
    setPhase('extracting')
    setError(null)
    setRetry(null)
    try {
      const res = await fetch('/api/profile/interview/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: transcript, mode: interviewMode }),
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
    startInterview('new')
  }

  function handleCancel() {
    if (!confirm('Leave the interview? Your answers in it will be discarded.')) return
    clearInterviewDraft()
    setMessages([])
    setError(null)
    setPhase('overview')
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
    const prevPhase = phase
    // Editing JSON from the overview stays on the overview while saving.
    if (prevPhase !== 'overview') setPhase('saving')
    setError(null)
    try {
      const profile = await putProfile(parsed)
      clearInterviewDraft()
      setMessages([])
      setSaved(profile)
      setEditingJson(false)
      setPhase('overview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the profile.')
      setPhase(prevPhase === 'overview' ? 'overview' : 'review')
    }
  }

  async function handleSaveContact(contact: ContactInfo) {
    if (!saved) return
    setSaved(await putProfile({ ...saved, contact }))
  }

  const inInterview = phase === 'chat' || phase === 'extracting'

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-2xl font-semibold">{phase === 'overview' ? 'Profile' : 'Profile interview'}</h1>
        {inInterview && (
          <div className="flex gap-3">
            {saved && (
              <button onClick={handleCancel} disabled={sending} className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50">
                Cancel
              </button>
            )}
            {messages.length > 1 && (
              <button onClick={handleStartOver} disabled={sending} className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50">
                Start over
              </button>
            )}
          </div>
        )}
      </div>

      {phase === 'loading' && <p className="text-sm text-gray-500">Loading…</p>}

      {phase === 'overview' && saved && (
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Panel title="Contact details" description="Printed on your resume exactly as entered here.">
              <ContactForm initial={saved.contact} onSave={handleSaveContact} />
            </Panel>
            <Panel title="Your profile" description="Built from the interview. The match analysis and resume use only this.">
              {editingJson ? (
                <>
                  <textarea
                    value={profileJson}
                    onChange={e => setProfileJson(e.target.value)}
                    rows={24}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs font-mono"
                  />
                  {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
                  <div className="mt-3 flex gap-2">
                    <button onClick={handleSave} className="px-3 py-2 rounded-lg text-sm bg-blue-700 text-white hover:bg-blue-800">
                      Save
                    </button>
                    <button onClick={() => setEditingJson(false)} className="px-3 py-2 rounded-lg border text-sm">
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <ProfileOverview profile={saved} />
              )}
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Ready for a resume?" description="What's still missing.">
              <CompletenessList items={profileCompleteness(saved)} />
            </Panel>
            <Panel title="Update profile">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => startInterview('update')}
                  className="px-3 py-2 rounded-lg text-sm bg-blue-700 text-white hover:bg-blue-800"
                >
                  Fill gaps / add something new
                </button>
                <p className="text-xs text-gray-500">
                  A follow-up interview that starts from your saved profile — for a new job, a new project, or
                  anything a vacancy analysis said to add.
                </p>
                <button
                  onClick={() => {
                    setProfileJson(JSON.stringify(saved, null, 2))
                    setError(null)
                    setEditingJson(true)
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                >
                  Edit as JSON
                </button>
                <button
                  onClick={() => {
                    if (confirm('Run the full interview from scratch? Your saved profile stays until you save the new one.')) {
                      startInterview('new')
                    }
                  }}
                  className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900"
                >
                  Redo full interview
                </button>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {inInterview && (
        <Card>
          {mode === 'new' && messages.length <= 1 && (
            <p className="text-xs text-gray-500 mb-3">
              A full interview — work history, projects, education, languages — takes about 15–20 minutes. Your
              answers are saved as you go, so you can close the tab and come back.
            </p>
          )}
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
            {(sending || phase === 'extracting') && (
              <p className="text-sm text-gray-400 italic">{phase === 'extracting' ? 'Building your profile…' : 'Thinking…'}</p>
            )}
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
            Here&rsquo;s what the interview came away with. Check it over — especially that every job has the right
            &ldquo;kind&rdquo; (commercial / internship / …) and that nothing is overstated — and edit the JSON directly
            if anything&rsquo;s off, then save.
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
    </div>
  )
}
