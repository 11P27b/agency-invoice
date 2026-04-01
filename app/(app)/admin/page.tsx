import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !ADMIN_EMAIL || user.email !== ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  const service = await createServiceClient()

  const { data: users } = await service
    .from('users')
    .select('id, email, name, company_name, plan, trial_ends_at, welcome_email_sent, created_at')
    .order('created_at', { ascending: false })

  const userIds = (users ?? []).map(u => u.id)
  if (userIds.length === 0) {
    return <EmptyState />
  }

  const { data: workspaces } = await service
    .from('workspaces')
    .select('id, owner_user_id')
    .in('owner_user_id', userIds)

  const workspaceIds = (workspaces ?? []).map(w => w.id)
  const workspaceByOwner = Object.fromEntries((workspaces ?? []).map(w => [w.owner_user_id, w]))

  const [{ data: clientRows }, { data: invoiceRows }, { data: feedbackRows }] = await Promise.all([
    service.from('clients').select('workspace_id').in('workspace_id', workspaceIds),
    service.from('invoices').select('workspace_id').in('workspace_id', workspaceIds),
    service.from('feedback_responses').select('user_id').in('user_id', userIds),
  ])

  const clientsByWs = (clientRows ?? []).reduce<Record<string, number>>((acc, c) => {
    acc[c.workspace_id] = (acc[c.workspace_id] ?? 0) + 1
    return acc
  }, {})

  const invoicesByWs = (invoiceRows ?? []).reduce<Record<string, number>>((acc, i) => {
    acc[i.workspace_id] = (acc[i.workspace_id] ?? 0) + 1
    return acc
  }, {})

  const feedbackUserIds = new Set((feedbackRows ?? []).map(f => f.user_id))

  const paidCount = (users ?? []).filter(u => u.plan === 'early_access').length

  const PLAN_LABEL: Record<string, string> = {
    trial: 'Trial',
    early_access: 'Paid $199',
    standard: 'Standard',
    cancelled: 'Cancelled',
  }

  const PLAN_COLOR: Record<string, string> = {
    trial: 'bg-amber-100 text-amber-700',
    early_access: 'bg-green-100 text-green-700',
    standard: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Beta Admin</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {(users ?? []).length} total signups · {paidCount} paying customers
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium">Total signups</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{(users ?? []).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium">Paying customers</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{paidCount}</p>
          <p className="text-xs text-gray-400 mt-1">@ $199/mo each</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium">MRR</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">${paidCount * 199}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">All beta users</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Clients</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Invoices</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Welcome</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Feedback</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(users ?? []).map(u => {
                const ws = workspaceByOwner[u.id]
                const clients = ws ? (clientsByWs[ws.id] ?? 0) : 0
                const invoices = ws ? (invoicesByWs[ws.id] ?? 0) : 0
                const hasFeedback = feedbackUserIds.has(u.id)
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{u.name ?? '—'}</p>
                      <p className="text-gray-400 text-xs">{u.email}</p>
                      {u.company_name && (
                        <p className="text-gray-500 text-xs">{u.company_name}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLOR[u.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                        {PLAN_LABEL[u.plan] ?? u.plan}
                      </span>
                      {u.plan === 'trial' && u.trial_ends_at && (
                        <p className="text-gray-400 text-xs mt-0.5">
                          Expires {formatDate(u.trial_ends_at)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clients > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                        {clients}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={invoices > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                        {invoices}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={u.welcome_email_sent ? 'text-green-600' : 'text-gray-400'}>
                        {u.welcome_email_sent ? '✓' : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={hasFeedback ? 'text-green-600' : 'text-gray-400'}>
                        {hasFeedback ? '✓' : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {formatDate(u.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Beta Admin</h1>
      <p className="text-gray-500">No users yet.</p>
    </div>
  )
}
