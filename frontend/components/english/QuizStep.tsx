"use client"
import React, { useState } from 'react'
import type { QuizQuestion } from '@/types'

// One question at a time, no feedback until the end — seeing right/wrong
// mid-quiz would change how the rest gets answered.
export default function QuizStep({
  questions,
  answers,
  onAnswer,
  onFinish,
}: {
  questions: QuizQuestion[]
  answers: (number | null)[]
  onAnswer: (index: number, option: number) => void
  onFinish: () => void
}) {
  const firstUnanswered = answers.findIndex(a => a === null)
  const [current, setCurrent] = useState(firstUnanswered === -1 ? 0 : firstUnanswered)
  const q = questions[current]
  const answered = answers.filter(a => a !== null).length
  const isLast = current === questions.length - 1

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span>
          Question {current + 1} of {questions.length}
        </span>
        <span>{answered} answered</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 mb-5 overflow-hidden">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>

      {q.passage && (
        <blockquote className="text-sm text-gray-800 bg-gray-50 border-l-2 border-gray-300 px-4 py-3 mb-4 whitespace-pre-wrap">{q.passage}</blockquote>
      )}
      <p className="text-sm font-medium text-gray-900 mb-3 whitespace-pre-wrap">{q.prompt}</p>
      <div className="space-y-2">
        {q.options.map((option, i) => {
          const selected = answers[current] === i
          return (
            <button
              key={i}
              onClick={() => onAnswer(current, i)}
              className={
                'w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ' +
                (selected ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white hover:bg-gray-50')
              }
            >
              <span className="text-gray-400 mr-2">{String.fromCharCode(65 + i)}.</span>
              {option}
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setCurrent(c => c - 1)}
          disabled={current === 0}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-40"
        >
          Back
        </button>
        {isLast ? (
          <button onClick={onFinish} className="px-4 py-2 rounded-lg bg-blue-700 text-sm font-medium text-white hover:bg-blue-800">
            {answered < questions.length ? `Continue (${questions.length - answered} skipped)` : 'Continue to writing'}
          </button>
        ) : (
          <button
            onClick={() => setCurrent(c => c + 1)}
            className="px-4 py-2 rounded-lg bg-blue-700 text-sm font-medium text-white hover:bg-blue-800"
          >
            {answers[current] === null ? "Skip — I don't know" : 'Next'}
          </button>
        )}
      </div>
    </div>
  )
}
