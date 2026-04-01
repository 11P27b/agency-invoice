import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_user_id', user!.id)
    .single()

  if (!workspace) {
    return <div className="p-8 text-gray-500">Setting up your workspace...</div>
  }

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('workspace_id', workspace.id)
    .neq('status', 'cancelled')

  const { data: attempts } = await supabase
    .from('follow_up_attempts')
    .select('*, invoice:invoices!inner(workspace_id)')
    .eq('invoice.workspace_id', workspace.id)

  const allInvoices = invoices ?? []
  const allAttempts = attempts ?? []

  // Invoice stats
  const totalInvoices = allInvoices.length
  const paidInvoices = allInvoices.filter(i => i.status === 'paid')
  const overdueInvoices = allInvoices.filter(i => i.status === 'overdue')
  const collectionRate = totalInvoices > 0
    ? Math.round((paidInvoices.length / totalInvoices) * 100)
    : 0

  const totalBilledCents = allInvoices.reduce((s, i) => s + i.amount_cents, 0)
  const totalCollectedCents = paidInvoices.reduce((s, i) => s + i.amount_cents, 0)
  const totalOverdueCents = overdueInvoices.reduce((s, i) => s + i.amount_cents, 0)

  // Follow-up stats
  const sentAttempts = allAttempts.filter(a => a.status === 'sent' || a.status === 'delivered')
  const openedAttempts = allAttempts.filter(a => a.status === 'opened' || a.status === 'clicked')
  const openRate = sentAttempts.length > 0
    ? Math.round((openedAttempts.length / sentAttempts.length) * 100)
    : 0

  // Monthly breakdown (last 6 months)
  const now = new Date()
  const months: { label: string; billedCents: number; collectedCents: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
    const monthInvoices = allInvoices.filter(inv => {
      const created = new Date(inv.created_at)
      return created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear()
    })
    months.push({
      label,
      billedCents: monthInvoices.reduce((s, i) => s + i.amount_cents, 0),
      collectedCents: monthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount_cents, 0),
    })
  }

  const maxMonthCents = Math.max(...months.map(m => m.billedCents), 1)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Invoice and follow-up performance</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-6 mb-8 lg:grid-cols-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total billed</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(totalBilledCents)}</p>
          <p className="text-xs text-gray-400 mt-1">{totalInvoices} invoices</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Collected</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(totalCollectedCents)}</p>
          <p className="text-xs text-gray-400 mt-1">{collectionRate}% collection rate</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Outstanding</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(totalOverdueCents)}</p>
          <p className="text-xs text-gray-400 mt-1">{overdueInvoices.length} overdue invoices</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email open rate</p>
          <p className="text-2xl font-bold text-indigo-600 mt-2">{openRate}%</p>
          <p className="text-xs text-gray-400 mt-1">{sentAttempts.length} follow-ups sent</p>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-6">Monthly billed vs collected</h2>
        {totalInvoices === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No data yet — add your first invoice to see trends.</p>
        ) : (
          <div className="flex items-end gap-4 h-40">
            {months.map(m => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-1 h-32">
                  <div
                    className="flex-1 bg-indigo-200 rounded-t"
                    style={{ height: `${Math.round((m.billedCents / maxMonthCents) * 100)}%` }}
                    title={`Billed: ${formatCurrency(m.billedCents)}`}
                  />
                  <div
                    className="flex-1 bg-green-400 rounded-t"
                    style={{ height: `${Math.round((m.collectedCents / maxMonthCents) * 100)}%` }}
                    title={`Collected: ${formatCurrency(m.collectedCents)}`}
                  />
                </div>
                <p className="text-xs text-gray-400">{m.label}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-indigo-200" />
            <span className="text-xs text-gray-500">Billed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-400" />
            <span className="text-xs text-gray-500">Collected</span>
          </div>
        </div>
      </div>

      {/* Invoice status breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Invoice status breakdown</h2>
        {totalInvoices === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No invoices yet.</p>
        ) : (
          <div className="space-y-3">
            {(['paid', 'sent', 'overdue', 'draft', 'partial'] as const).map(status => {
              const count = allInvoices.filter(i => i.status === status).length
              const pct = Math.round((count / totalInvoices) * 100)
              const colorMap: Record<string, string> = {
                paid: 'bg-green-500',
                sent: 'bg-blue-500',
                overdue: 'bg-red-500',
                draft: 'bg-gray-400',
                partial: 'bg-yellow-500',
              }
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-700">{status}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colorMap[status]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
