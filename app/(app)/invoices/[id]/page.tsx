import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate, invoiceStatusColor, daysOverdue } from '@/lib/utils'
import { InvoiceDetailClient } from './InvoiceDetailClient'
import type { DbFollowUpStep } from '@/types/database'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, client:clients(*), attempts:follow_up_attempts(*, step:follow_up_steps(*))')
    .eq('id', id)
    .single()

  if (error || !invoice) notFound()

  // Get workspace + default sequence steps for the send picker
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_user_id', user!.id)
    .single()

  const { data: defaultSeq } = await supabase
    .from('follow_up_sequences')
    .select('id, name, steps:follow_up_steps(*)')
    .eq('workspace_id', workspace!.id)
    .eq('is_default', true)
    .single()

  const steps = (defaultSeq?.steps ?? []) as DbFollowUpStep[]
  const sortedSteps = steps.sort((a, b) => a.step_order - b.step_order)

  const attempts = ((invoice.attempts as unknown[]) ?? []).sort(
    (a: unknown, b: unknown) =>
      new Date((b as { created_at: string }).created_at).getTime() -
      new Date((a as { created_at: string }).created_at).getTime()
  )

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm text-gray-400 mb-1">Invoice #{invoice.invoice_number}</p>
          <h1 className="text-2xl font-bold text-gray-900">{invoice.client?.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{invoice.client?.email}</p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${invoiceStatusColor(invoice.status)}`}>
          {invoice.status}
        </span>
      </div>

      {/* Invoice details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Amount</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(invoice.amount_cents, invoice.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Due date</p>
            <p className="text-sm font-medium text-gray-700">{formatDate(invoice.due_date)}</p>
            {invoice.status === 'overdue' && (
              <p className="text-xs text-red-500 mt-0.5">{daysOverdue(invoice.due_date)} days overdue</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Follow-ups</p>
            <p className="text-sm font-medium text-gray-700">{attempts.length} sent</p>
          </div>
        </div>
        {invoice.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-gray-600">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Manual send panel */}
      <InvoiceDetailClient
        invoiceId={invoice.id}
        invoiceStatus={invoice.status}
        steps={sortedSteps}
      />

      {/* Attempt history */}
      {attempts.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Follow-up history</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {attempts.map((attempt: unknown) => {
              const a = attempt as {
                id: string
                status: string
                created_at: string
                sent_at: string | null
                step?: { subject_template: string; tone: string; days_after_due: number } | null
              }
              return (
                <div key={a.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {a.step?.subject_template ?? 'Custom send'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.sent_at ? formatDate(a.sent_at) : formatDate(a.created_at)}
                      {a.step && <> · Day {a.step.days_after_due} · <span className="capitalize">{a.step.tone}</span></>}
                    </p>
                  </div>
                  <AttemptStatusBadge status={a.status} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function AttemptStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    opened: 'bg-indigo-100 text-indigo-700',
    clicked: 'bg-purple-100 text-purple-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}
