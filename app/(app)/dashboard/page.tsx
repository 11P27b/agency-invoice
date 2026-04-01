import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, daysOverdue } from '@/lib/utils'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_user_id', user!.id)
    .single()

  // Onboarding checklist data
  const { count: clientCount } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace?.id ?? '')
  const { count: invoiceCount } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace?.id ?? '')
  const { data: defaultSeq } = await supabase
    .from('follow_up_sequences')
    .select('id')
    .eq('workspace_id', workspace?.id ?? '')
    .eq('is_default', true)
    .maybeSingle()
  const showOnboarding = (clientCount ?? 0) === 0 || (invoiceCount ?? 0) === 0

  if (!workspace) {
    return <div className="p-8 text-gray-500">Setting up your workspace...</div>
  }

  // Get summary stats
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, client:clients(*)')
    .eq('workspace_id', workspace.id)
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true })

  const allInvoices = invoices ?? []
  const overdueInvoices = allInvoices.filter(i => i.status === 'overdue')
  const outstandingCents = allInvoices
    .filter(i => !['paid', 'cancelled'].includes(i.status))
    .reduce((sum, i) => sum + i.amount_cents, 0)
  const collectedThisMonthCents = allInvoices
    .filter(i => {
      if (i.status !== 'paid') return false
      const updated = new Date(i.updated_at)
      const now = new Date()
      return updated.getMonth() === now.getMonth() && updated.getFullYear() === now.getFullYear()
    })
    .reduce((sum, i) => sum + i.amount_cents, 0)

  const recentOverdue = overdueInvoices.slice(0, 5)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">{workspace.name}</p>
      </div>

      {/* Onboarding checklist — shown until workspace is set up */}
      {showOnboarding && (
        <div className="mb-8 bg-indigo-50 border border-indigo-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Get started with Settled</h2>
          <p className="text-sm text-gray-500 mb-4">Complete these steps to start automating your invoice follow-ups.</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                (clientCount ?? 0) > 0 ? 'bg-green-500 text-white' : 'bg-white border-2 border-indigo-300 text-indigo-600'
              }`}>
                {(clientCount ?? 0) > 0 ? '✓' : '1'}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${(clientCount ?? 0) > 0 ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  Add your first client
                </p>
              </div>
              {(clientCount ?? 0) === 0 && (
                <Link href="/clients/new" className="text-xs text-indigo-600 font-medium hover:underline flex-shrink-0">
                  Add client →
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                (invoiceCount ?? 0) > 0 ? 'bg-green-500 text-white' : 'bg-white border-2 border-indigo-300 text-indigo-600'
              }`}>
                {(invoiceCount ?? 0) > 0 ? '✓' : '2'}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${(invoiceCount ?? 0) > 0 ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  Add an invoice
                </p>
              </div>
              {(invoiceCount ?? 0) === 0 && (
                <Link href="/invoices/new" className="text-xs text-indigo-600 font-medium hover:underline flex-shrink-0">
                  Add invoice →
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                defaultSeq ? 'bg-green-500 text-white' : 'bg-white border-2 border-indigo-300 text-indigo-600'
              }`}>
                {defaultSeq ? '✓' : '3'}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${defaultSeq ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  Review your follow-up sequence
                </p>
                {!defaultSeq && (
                  <p className="text-xs text-gray-500">Your default sequence is pre-configured — check it out</p>
                )}
              </div>
              {!defaultSeq && (
                <Link href="/sequences" className="text-xs text-indigo-600 font-medium hover:underline flex-shrink-0">
                  View sequences →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium">Outstanding</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(outstandingCents)}</p>
          <p className="text-xs text-gray-400 mt-1">{allInvoices.filter(i => !['paid','cancelled'].includes(i.status)).length} invoices</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium">Overdue</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{overdueInvoices.length}</p>
          <p className="text-xs text-gray-400 mt-1">invoices past due</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium">Collected this month</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(collectedThisMonthCents)}</p>
          <p className="text-xs text-gray-400 mt-1">paid invoices</p>
        </div>
      </div>

      {/* Overdue invoices */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Overdue invoices</h2>
          <Link href="/invoices?status=overdue" className="text-sm text-indigo-600 hover:underline">
            View all
          </Link>
        </div>

        {recentOverdue.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <p className="text-lg">No overdue invoices</p>
            <p className="text-sm mt-1">All caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentOverdue.map(invoice => (
              <div key={invoice.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900">{invoice.client?.name}</p>
                  <p className="text-sm text-gray-500">
                    Invoice #{invoice.invoice_number} · Due {formatDate(invoice.due_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(invoice.amount_cents)}</p>
                  <p className="text-xs text-red-500 mt-0.5">{daysOverdue(invoice.due_date)} days overdue</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick action */}
      <div className="mt-6">
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Add invoice
        </Link>
      </div>
    </div>
  )
}
