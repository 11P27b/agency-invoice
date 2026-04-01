'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DbFollowUpStep } from '@/types/database'

interface Props {
  invoiceId: string
  invoiceStatus: string
  steps: DbFollowUpStep[]
}

export function InvoiceDetailClient({ invoiceId, invoiceStatus, steps }: Props) {
  const [selectedStepId, setSelectedStepId] = useState(steps[0]?.id ?? '')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  if (invoiceStatus === 'paid' || invoiceStatus === 'cancelled') {
    return null
  }

  if (steps.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 text-sm text-yellow-700">
        No follow-up steps configured. <Link href="/sequences" className="underline">Set up a sequence</Link> to enable sending.
      </div>
    )
  }

  async function handleSend() {
    if (!selectedStepId) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_id: selectedStepId }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ ok: true, message: 'Email sent successfully.' })
      } else {
        setResult({ ok: false, message: data.error ?? 'Failed to send email.' })
      }
    } catch {
      setResult({ ok: false, message: 'Network error. Please try again.' })
    } finally {
      setSending(false)
    }
  }

  const selectedStep = steps.find(s => s.id === selectedStepId)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Send follow-up email</h2>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Select step to send</label>
          <select
            value={selectedStepId}
            onChange={e => setSelectedStepId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {steps.map(step => (
              <option key={step.id} value={step.id}>
                Day {step.days_after_due} — {step.tone} tone · {step.subject_template}
              </option>
            ))}
          </select>
        </div>

        {selectedStep && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-600 space-y-1">
            <p><span className="font-medium">Subject:</span> {selectedStep.subject_template}</p>
            <p className="whitespace-pre-wrap leading-relaxed mt-1 text-gray-500 border-t border-gray-100 pt-1">
              {selectedStep.body_template}
            </p>
          </div>
        )}

        {result && (
          <div className={`text-sm px-3 py-2 rounded-lg ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result.message}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !selectedStepId}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {sending ? 'Sending…' : 'Send now'}
        </button>
      </div>
    </div>
  )
}
