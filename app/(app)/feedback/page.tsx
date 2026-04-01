'use client'

import { useState } from 'react'

const QUESTIONS = [
  {
    id: 'what_works_well',
    label: 'What is working well for you so far?',
    placeholder: 'e.g. the onboarding flow, the email templates, the dashboard...',
  },
  {
    id: 'what_is_frustrating',
    label: 'What is frustrating or confusing?',
    placeholder: 'Be honest — this is how we improve.',
  },
  {
    id: 'what_would_drive_referral',
    label: 'What would make you recommend Settled to a fellow business owner?',
    placeholder: 'e.g. a specific feature, pricing change, integration...',
  },
]

export default function FeedbackPage() {
  const [nps, setNps] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nps) return
    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nps_score: nps, ...answers }),
    })

    if (res.ok) {
      setDone(true)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong. Please try again.')
    }
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="p-8 max-w-xl">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            ✓
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Thank you for your feedback!</h2>
          <p className="text-sm text-gray-600">
            Your input helps us build a better product. We read every response and will follow up if
            we have questions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Share your feedback</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Takes about 2 minutes. Helps us build what matters most to you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* NPS */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How likely are you to recommend Settled to another business owner?
            <span className="text-gray-400 font-normal ml-1">(1 = not likely, 10 = very likely)</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setNps(n)}
                className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-colors ${
                  nps === n
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Qualitative questions */}
        {QUESTIONS.map(q => (
          <div key={q.id}>
            <label htmlFor={q.id} className="block text-sm font-medium text-gray-700 mb-1">
              {q.label}
            </label>
            <textarea
              id={q.id}
              rows={3}
              placeholder={q.placeholder}
              value={answers[q.id] ?? ''}
              onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!nps || submitting}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit feedback'}
        </button>
      </form>
    </div>
  )
}
