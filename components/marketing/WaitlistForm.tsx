'use client'

import { useState } from 'react'

interface WaitlistFormProps {
  formId: string
  variant?: 'default' | 'pricing' | 'footer'
}

export function WaitlistForm({ formId, variant = 'default' }: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: formId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    if (variant === 'footer') {
      return (
        <div className="p-4 rounded-xl bg-brand-700 text-white text-sm font-medium">
          You&apos;re in. We&apos;ll be in touch.
        </div>
      )
    }
    if (variant === 'pricing') {
      return (
        <div className="p-4 rounded-xl bg-white border border-brand-300 text-brand-800 text-sm font-medium">
          You&apos;re on the list! We&apos;ll email you when your spot opens.
        </div>
      )
    }
    return (
      <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 text-sm font-medium">
        You&apos;re on the list. We&apos;ll reach out when your spot is ready.
      </div>
    )
  }

  const isFooter = variant === 'footer'
  const isPricing = variant === 'pricing'

  return (
    <form onSubmit={handleSubmit} className={isFooter ? 'flex flex-col sm:flex-row gap-3' : ''}>
      {isPricing ? (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full px-4 py-3.5 rounded-xl border border-brand-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-base mb-3 bg-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 active:bg-brand-800 transition-colors text-base disabled:opacity-60"
          >
            {loading ? 'Joining…' : 'Secure my early access spot'}
          </button>
        </>
      ) : isFooter ? (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@youragency.com"
            required
            className="flex-1 px-4 py-3.5 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none text-base"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3.5 rounded-xl bg-brand-900 text-white font-semibold hover:bg-gray-900 transition-colors text-base whitespace-nowrap disabled:opacity-60"
          >
            {loading ? 'Joining…' : 'Join the waitlist'}
          </button>
        </>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@youragency.com"
              required
              className="flex-1 px-4 py-3.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-base shadow-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 active:bg-brand-800 transition-colors text-base shadow-sm whitespace-nowrap disabled:opacity-60"
            >
              {loading ? 'Joining…' : 'Join the waitlist'}
            </button>
          </div>
          <p className="mt-3 text-sm text-gray-500">No credit card required. Cancel anytime.</p>
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  )
}
