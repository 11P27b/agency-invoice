import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, invoiceStatusColor, daysOverdue } from '@/lib/utils'
import Link from 'next/link'

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_user_id', user!.id)
    .single()

  let query = supabase
    .from('invoices')
    .select('*, client:clients(*)')
    .eq('workspace_id', workspace!.id)
    .order('due_date', { ascending: true })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: invoices } = await query

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 mt-1">{invoices?.length ?? 0} invoices</p>
        </div>
        <Link
          href="/invoices/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + New invoice
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6">
        {['', 'overdue', 'sent', 'paid'].map(s => (
          <Link
            key={s}
            href={s ? `/invoices?status=${s}` : '/invoices'}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === s || (!status && !s)
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s || 'All'}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!invoices || invoices.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400">
            <p className="text-lg">No invoices yet</p>
            <Link href="/invoices/new" className="text-sm text-indigo-600 hover:underline mt-2 inline-block">
              Add your first invoice
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Invoice #</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Due date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Overdue</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map(invoice => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{invoice.client?.name}</p>
                    <p className="text-xs text-gray-400">{invoice.client?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">#{invoice.invoice_number}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {formatCurrency(invoice.amount_cents)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(invoice.due_date)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${invoiceStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {invoice.status === 'overdue' ? (
                      <span className="text-red-500">{daysOverdue(invoice.due_date)}d</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/invoices/${invoice.id}`} className="text-sm text-indigo-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
