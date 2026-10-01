"use client"
import React, { useEffect, useRef, useState } from 'react'
import Panel from '@/frontend/components/dashboard/Panel'
import QuizStep from '@/frontend/components/english/QuizStep'
import WritingStep from '@/frontend/components/english/WritingStep'
import ChatStep from '@/frontend/components/english/ChatStep'
import AssessmentResult from '@/frontend/components/english/AssessmentResult'
import { timeAgo } from '@/frontend/helpers/timeAgo'
import {
  clearEnglishDraft,
  loadEnglishDraft,
  saveEnglishDraft,
  type EnglishDraft,
  type InterviewMessage,
} from '@/frontend/helpers/storage'
import type { EnglishAssessment, EnglishTest } from '@/types'

type Stage = 'intro' | 'generating' | 'quiz' | 'writing' | 'chat' | 'evaluating' | 'result'

const STEPS: { stage: Stage; label: string }[] = [
  { stage: 'quiz', label: '1. Quiz' },
  { stage: 'writing', label: '2. Writing' },
  { stage: 'chat', label: '3. Chat' },
]

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.details || data.error || `HTTP ${res.status}`)
  return data as T
}

// English level test: quiz (scored in code) → two writing tasks → a short
// chat, then one evaluation into CEFR levels. The latest result feeds the
// vacancy match and the resume's languages line.
export default function EnglishPage() {
  const [stage, setStage] = useState<Stage>('intro')
  const [history, setHistory] = useState<EnglishAssessment[] | null>(null)
  const [test, setTest] = useState<EnglishTest | null>(null)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [writing, setWriting] = useState<string[]>([])
  const [chat, setChat] = useState<InterviewMessage[]>([])
  const [chatDone, setChatDone] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justTaken, setJustTaken] = useState<EnglishAssessment | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    fetch('/api/english')
      .then(res => (res.ok ? res.json() : []))
      .then(setHistory)
      .catch(() => setHistory([]))
    const draft = loadEnglishDraft()
    if (draft) {
      setTest(draft.test)
      setAnswers(draft.answers)
      setWriting(draft.writing)
      setChat(draft.chat)
      setChatDone(draft.chatDone)
      setStage(draft.stage)
      if (draft.stage === 'chat' && draft.chat.length === 0) void sendChat([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Autosave while a test is in progress.
  useEffect(() => {
    if (!test || (stage !== 'quiz' && stage !== 'writing' && stage !== 'chat')) return
    const draft: EnglishDraft = { stage, test, answers, writing, chat, chatDone }
    saveEnglishDraft(draft)
  }, [stage, test, answers, writing, chat, chatDone])

  async function start() {
    setStage('generating')
    setError(null)
    setJustTaken(null)
    try {
      const generated = await postJson<EnglishTest>('/api/english/test')
      setTest(generated)
      setAnswers(generated.questions.map(() => null))
      setWriting(generated.writingTasks.map(() => ''))
      setChat([])
      setChatDone(false)
      setStage('quiz')
    } catch (e) {
      setError(`Could not generate a test${e instanceof Error ? ` (${e.message})` : ''}. Try again.`)
      setStage('intro')
    }
  }

  async function sendChat(messages: InterviewMessage[]) {
    setSending(true)
    setError(null)
    try {
      const reply = await postJson<{ message: string; done: boolean }>('/api/english/chat', { messages })
      setChat([...messages, { role: 'assistant', content: reply.message }])
      if (reply.done) setChatDone(true)
    } catch (e) {
      setError('The chat did not respond. Your answers are saved — press Retry.')
    } finally {
      setSending(false)
    }
  }

  function goToChat() {
    setStage('chat')
    if (chat.length === 0) void sendChat([])
  }

  async function evaluate() {
    if (!test) return
    setStage('evaluating')
    setError(null)
    try {
      const saved = await postJson<EnglishAssessment>('/api/english/evaluate', { test, answers, writing, conversation: chat })
      clearEnglishDraft()
      setJustTaken(saved)
      setHistory(prev => [saved, ...(prev ?? [])])
      setStage('result')
    } catch (e) {
      setError(`Could not evaluate${e instanceof Error ? ` (${e.message})` : ''}. Your answers are saved — try again.`)
      setStage('chat')
    }
  }

  function abandon() {
    if (!confirm('Abandon this test? Everything you answered in it will be discarded.')) return
    clearEnglishDraft()
    setTest(null)
    setStage('intro')
  }

  const latest = history?.[0] ?? null
  const inTest = stage === 'quiz' || stage === 'writing' || stage === 'chat'

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">English level</h1>
          <p className="text-sm text-gray-500 mt-1">A CEFR estimate from a quiz, two writing tasks and a short chat — about 25 minutes.</p>
        </div>
        {inTest && (
          <button onClick={abandon} className="text-sm text-gray-500 hover:text-gray-900">
            Abandon test
          </button>
        )}
      </div>

      {error && stage !== 'chat' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">{error}</div>
      )}

      {inTest && (
        <div className="flex gap-2 mb-4">
          {STEPS.map(s => (
            <span
              key={s.stage}
              className={
                'text-xs px-2.5 py-1 rounded-full ' +
                (s.stage === stage ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-500')
              }
            >
              {s.label}
            </span>
          ))}
        </div>
      )}

      {(stage === 'intro' || stage === 'generating') && (
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            {latest ? (
              <Panel title="Your latest result" description={`Taken ${timeAgo(latest.createdAt)}. Used in vacancy matches and on your resume.`}>
                <AssessmentResult result={latest.result} quizScore={latest.quizScore} />
              </Panel>
            ) : (
              <Panel title="No result yet">
                <p className="text-sm text-gray-600">
                  Take the test once to get a measured level instead of a self-estimate. Vacancy matches will compare
                  it against what each posting asks for, and your resume will use it.
                </p>
              </Panel>
            )}
          </div>
          <div className="space-y-6">
            <Panel title={latest ? 'Retake' : 'Take the test'}>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1 mb-4">
                <li>16 questions, A2 to C1 — skip what you don&rsquo;t know rather than guess.</li>
                <li>Two short writing tasks.</li>
                <li>A chat with a &ldquo;recruiter&rdquo;, about 6 questions.</li>
                <li>No translators or AI — pasting is turned off.</li>
              </ul>
              <button
                onClick={start}
                disabled={stage === 'generating'}
                className="w-full px-4 py-2 rounded-lg bg-blue-700 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {stage === 'generating' ? 'Preparing your test… (about 30 seconds)' : 'Start'}
              </button>
            </Panel>
            {history && history.length > 1 && (
              <Panel title="History">
                <ul className="space-y-1">
                  {history.map(a => (
                    <li key={a.id} className="flex justify-between text-sm">
                      <span className="text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</span>
                      <span className="font-medium text-gray-900">{a.overallLevel}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      )}

      {inTest && test && (
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 max-w-3xl">
          {stage === 'quiz' && (
            <QuizStep
              questions={test.questions}
              answers={answers}
              onAnswer={(i, option) => setAnswers(prev => prev.map((a, j) => (j === i ? option : a)))}
              onFinish={() => setStage('writing')}
            />
          )}
          {stage === 'writing' && (
            <WritingStep
              tasks={test.writingTasks}
              texts={writing}
              onChange={(i, text) => setWriting(prev => prev.map((t, j) => (j === i ? text : t)))}
              onFinish={goToChat}
            />
          )}
          {stage === 'chat' && (
            <ChatStep
              messages={chat}
              sending={sending}
              done={chatDone}
              error={error}
              onSend={text => {
                const next = [...chat, { role: 'user' as const, content: text }]
                setChat(next)
                void sendChat(next)
              }}
              onRetry={() => void (chatDone ? evaluate() : sendChat(chat))}
              onFinish={evaluate}
            />
          )}
        </section>
      )}

      {stage === 'evaluating' && <p className="text-sm text-gray-500">Assessing your answers… (about 30 seconds)</p>}

      {stage === 'result' && justTaken && test && (
        <div className="max-w-3xl">
          <Panel title="Your result">
            <AssessmentResult result={justTaken.result} quizScore={justTaken.quizScore} review={{ test, answers }} />
          </Panel>
          <button onClick={() => setStage('intro')} className="mt-4 text-sm text-gray-600 hover:text-gray-900">
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}
