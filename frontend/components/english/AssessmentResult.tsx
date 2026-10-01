import React from 'react'
import type { CefrLevel, EnglishAssessmentResult, EnglishTest, QuizScore } from '@/types'

const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const SKILL_LABEL: Record<keyof EnglishAssessmentResult['skills'], string> = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  reading: 'Reading',
  writing: 'Writing',
  interaction: 'Written interaction',
}

function LevelBar({ label, level }: { label: string; level: CefrLevel }) {
  const index = LEVELS.indexOf(level)
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 text-sm text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 grid grid-cols-6 gap-1">
        {LEVELS.map((l, i) => (
          <div key={l} className={'h-2 rounded-sm ' + (i <= index ? 'bg-blue-600' : 'bg-gray-100')} title={l} />
        ))}
      </div>
      <span className="w-8 text-sm font-semibold text-gray-900 text-right">{level}</span>
    </div>
  )
}

export default function AssessmentResult({
  result,
  quizScore,
  review,
}: {
  result: EnglishAssessmentResult
  quizScore: QuizScore
  // The test and answers, to show the quiz answer key — only available
  // right after taking it, not for past assessments.
  review?: { test: EnglishTest; answers: (number | null)[] }
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-blue-700 text-white grid place-items-center text-3xl font-semibold shrink-0">
          {result.overall}
        </div>
        <div>
          <p className="text-sm text-gray-800">{result.summary}</p>
          <p className="text-xs text-gray-500 mt-1">
            Quiz: {quizScore.correct}/{quizScore.total}. Speaking and listening are not measured by this test — on a
            resume, this level describes reading and writing.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {(Object.keys(SKILL_LABEL) as (keyof EnglishAssessmentResult['skills'])[]).map(k => (
          <LevelBar key={k} label={SKILL_LABEL[k]} level={result.skills[k]} />
        ))}
      </div>

      {result.strengths.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">Strengths</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
            {result.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {result.mistakes.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">Mistakes to fix</h3>
          <ul className="space-y-2">
            {result.mistakes.map((m, i) => (
              <li key={i} className="text-sm rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <div>
                  <span className="line-through text-red-700">{m.original}</span>
                  <span className="text-gray-400 mx-2">→</span>
                  <span className="text-green-800">{m.correction}</span>
                </div>
                <p className="text-gray-600 mt-0.5">{m.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">To reach the next level</h3>
          <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-0.5">
            {result.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        </div>
      )}

      {review && (
        <details className="rounded-lg border border-gray-200 bg-white">
          <summary className="px-4 py-2.5 text-sm font-medium text-gray-800 cursor-pointer">Quiz answers</summary>
          <ol className="px-4 pb-4 space-y-3">
            {review.test.questions.map((q, i) => {
              const chosen = review.answers[i]
              const right = chosen === q.answerIndex
              return (
                <li key={q.id} className="text-sm">
                  <div className="text-xs text-gray-400">
                    {i + 1}. {q.level} · {q.skill.toLowerCase()}
                  </div>
                  <p className="text-gray-900">{q.prompt}</p>
                  <p className={right ? 'text-green-800' : 'text-red-700'}>
                    {chosen === null ? 'Skipped' : `Your answer: ${q.options[chosen]}`}
                    {!right && <span className="text-green-800"> · Correct: {q.options[q.answerIndex]}</span>}
                  </p>
                  <p className="text-gray-500 text-xs">{q.explanation}</p>
                </li>
              )
            })}
          </ol>
        </details>
      )}
    </div>
  )
}
