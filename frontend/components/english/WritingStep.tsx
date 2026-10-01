"use client"
import React from 'react'
import type { WritingTask } from '@/types'

function wordCount(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

export default function WritingStep({
  tasks,
  texts,
  onChange,
  onFinish,
}: {
  tasks: WritingTask[]
  texts: string[]
  onChange: (index: number, text: string) => void
  onFinish: () => void
}) {
  const allStarted = texts.every(t => wordCount(t) >= 20)

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Write these yourself, without a translator or AI — otherwise the result will describe the tool, not you, and
        the level on your resume won&rsquo;t hold up in an interview.
      </p>
      {tasks.map((task, i) => {
        const words = wordCount(texts[i] ?? '')
        const inRange = words >= task.minWords && words <= task.maxWords
        return (
          <div key={task.id}>
            <div className="text-xs font-medium text-gray-500 mb-1">Task {i + 1}</div>
            <p className="text-sm text-gray-900 mb-2 whitespace-pre-wrap">{task.prompt}</p>
            <textarea
              value={texts[i] ?? ''}
              onChange={e => onChange(i, e.target.value)}
              onPaste={e => e.preventDefault()}
              rows={8}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
            />
            <div className={'text-xs mt-1 ' + (inRange ? 'text-green-700' : 'text-gray-500')}>
              {words} words (aim for {task.minWords}–{task.maxWords})
            </div>
          </div>
        )
      })}
      <div className="flex items-center gap-3">
        <button
          onClick={onFinish}
          disabled={!allStarted}
          className="px-4 py-2 rounded-lg bg-blue-700 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          Continue to the chat
        </button>
        {!allStarted && <span className="text-xs text-gray-500">Write at least 20 words for each task.</span>}
      </div>
    </div>
  )
}
