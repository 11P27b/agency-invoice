'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DbFollowUpStep, FollowUpTone } from '@/types/database'

interface Step extends DbFollowUpStep {}

interface Sequence {
  id: string
  name: string
  is_default: boolean
  steps: Step[]
}

const TONE_OPTIONS: { value: FollowUpTone; label: string; color: string }[] = [
  { value: 'friendly', label: 'Friendly', color: 'bg-green-100 text-green-700' },
  { value: 'firm', label: 'Firm', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'final', label: 'Final', color: 'bg-red-100 text-red-700' },
]

const TEMPLATE_VARS = [
  '{{client_name}}', '{{amount}}', '{{invoice_number}}',
  '{{due_date}}', '{{days_overdue}}', '{{sender_name}}',
]

const BLANK_STEP = {
  days_after_due: 1,
  tone: 'friendly' as FollowUpTone,
  subject_template: 'Reminder: Invoice {{invoice_number}} due',
  body_template: 'Hi {{client_name}},\n\nThis is a reminder about invoice {{invoice_number}} for {{amount}}, which was due on {{due_date}}.\n\nThank you,\n{{sender_name}}',
}

export function SequenceBuilder({ sequence: initial }: { sequence: Sequence }) {
  const [seq, setSeq] = useState(initial)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(initial.name)
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null)
  const [editingStep, setEditingStep] = useState<Partial<Step> | null>(null)
  const [addingStep, setAddingStep] = useState(false)
  const [newStep, setNewStep] = useState({ ...BLANK_STEP })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function saveName() {
    if (nameVal.trim() === seq.name) { setEditingName(false); return }
    setSaving(true)
    const res = await fetch(`/api/sequences/${seq.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameVal.trim() }),
    })
    const data = await res.json()
    if (res.ok) setSeq(s => ({ ...s, name: data.name }))
    setEditingName(false)
    setSaving(false)
  }

  async function saveStep(stepId: string) {
    if (!editingStep) return
    setSaving(true)
    setError('')
    const res = await fetch(`/api/sequences/${seq.id}/steps/${stepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingStep),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setSeq(s => ({ ...s, steps: s.steps.map(st => st.id === stepId ? data : st) }))
    setExpandedStepId(null)
    setEditingStep(null)
    setSaving(false)
  }

  async function deleteStep(stepId: string) {
    if (!confirm('Delete this step?')) return
    const res = await fetch(`/api/sequences/${seq.id}/steps/${stepId}`, { method: 'DELETE' })
    if (res.ok) setSeq(s => ({ ...s, steps: s.steps.filter(st => st.id !== stepId) }))
  }

  async function addStep() {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/sequences/${seq.id}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStep),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setSeq(s => ({ ...s, steps: [...s.steps, data] }))
    setAddingStep(false)
    setNewStep({ ...BLANK_STEP })
    setSaving(false)
  }

  function toneColor(tone: string) {
    return TONE_OPTIONS.find(t => t.value === tone)?.color ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Link href="/sequences" className="text-sm text-gray-400 hover:text-gray-600">
          ← Sequences
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              autoFocus
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
              className="text-2xl font-bold text-gray-900 border-b-2 border-indigo-500 outline-none bg-transparent w-full"
            />
            <button onClick={saveName} disabled={saving} className="text-sm text-indigo-600 hover:underline">Save</button>
            <button onClick={() => { setEditingName(false); setNameVal(seq.name) }} className="text-sm text-gray-400 hover:underline">Cancel</button>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{seq.name}</h1>
            {seq.is_default && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">Default</span>
            )}
            <button onClick={() => setEditingName(true)} className="text-xs text-gray-400 hover:text-gray-600 ml-1">Edit name</button>
          </div>
        )}
      </div>

      {/* Template variable reference */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6 text-xs text-gray-500">
        <span className="font-medium text-gray-700">Available template variables: </span>
        {TEMPLATE_VARS.map(v => (
          <code key={v} className="mx-1 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-600 font-mono">{v}</code>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {seq.steps.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No steps yet. Add your first follow-up step below.
          </div>
        )}

        {seq.steps.map((step, idx) => (
          <div key={step.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Step header */}
            <div
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => {
                if (expandedStepId === step.id) {
                  setExpandedStepId(null)
                  setEditingStep(null)
                } else {
                  setExpandedStepId(step.id)
                  setEditingStep({ ...step })
                }
              }}
            >
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{step.subject_template}</p>
                <p className="text-xs text-gray-400 mt-0.5">Day {step.days_after_due} after due date</p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${toneColor(step.tone)}`}>
                {step.tone}
              </span>
              <button
                onClick={e => { e.stopPropagation(); deleteStep(step.id) }}
                className="text-gray-300 hover:text-red-400 transition-colors ml-2"
                title="Delete step"
              >
                ✕
              </button>
            </div>

            {/* Expanded editor */}
            {expandedStepId === step.id && editingStep && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Days after due date</label>
                    <input
                      type="number"
                      min={0}
                      value={editingStep.days_after_due ?? ''}
                      onChange={e => setEditingStep(s => ({ ...s!, days_after_due: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tone</label>
                    <select
                      value={editingStep.tone ?? 'friendly'}
                      onChange={e => setEditingStep(s => ({ ...s!, tone: e.target.value as FollowUpTone }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {TONE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                  <input
                    type="text"
                    value={editingStep.subject_template ?? ''}
                    onChange={e => setEditingStep(s => ({ ...s!, subject_template: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Body</label>
                  <textarea
                    value={editingStep.body_template ?? ''}
                    onChange={e => setEditingStep(s => ({ ...s!, body_template: e.target.value }))}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => saveStep(step.id)}
                    disabled={saving}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving…' : 'Save step'}
                  </button>
                  <button
                    onClick={() => { setExpandedStepId(null); setEditingStep(null) }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add step */}
        {addingStep ? (
          <div className="bg-white border-2 border-dashed border-indigo-300 rounded-xl px-5 py-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">New step</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Days after due date</label>
                <input
                  type="number"
                  min={0}
                  value={newStep.days_after_due}
                  onChange={e => setNewStep(s => ({ ...s, days_after_due: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tone</label>
                <select
                  value={newStep.tone}
                  onChange={e => setNewStep(s => ({ ...s, tone: e.target.value as FollowUpTone }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {TONE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
              <input
                type="text"
                value={newStep.subject_template}
                onChange={e => setNewStep(s => ({ ...s, subject_template: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Body</label>
              <textarea
                value={newStep.body_template}
                onChange={e => setNewStep(s => ({ ...s, body_template: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={addStep}
                disabled={saving}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Adding…' : 'Add step'}
              </button>
              <button
                onClick={() => { setAddingStep(false); setNewStep({ ...BLANK_STEP }); setError('') }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingStep(true)}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
          >
            + Add step
          </button>
        )}
      </div>
    </div>
  )
}
