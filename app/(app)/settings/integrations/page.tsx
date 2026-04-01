import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_user_id', user!.id)
    .single()

  const { data: qbIntegration } = workspace
    ? await supabase
        .from('integrations')
        .select('status, last_synced_at')
        .eq('workspace_id', workspace.id)
        .eq('provider', 'quickbooks')
        .maybeSingle()
    : { data: null }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Settings nav tabs */}
      <div className="flex gap-1 mb-8 border-b border-gray-200">
        <Link
          href="/settings/billing"
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Billing
        </Link>
        <Link
          href="/settings/integrations"
          className="px-4 py-2 text-sm font-medium text-indigo-600 border-b-2 border-indigo-600 -mb-px"
        >
          Integrations
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-lg">
                📊
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">QuickBooks Online</h2>
                <p className="text-xs text-gray-500">Import open invoices automatically</p>
              </div>
            </div>
            {qbIntegration ? (
              <div className="mt-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  qbIntegration.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {qbIntegration.status === 'active' ? 'Connected' : 'Needs reconnection'}
                </span>
                {qbIntegration.last_synced_at && (
                  <p className="text-xs text-gray-400 mt-1">
                    Last synced {new Date(qbIntegration.last_synced_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-2">Not connected</p>
            )}
          </div>
          <div>
            {qbIntegration?.status === 'active' ? (
              <a
                href="/api/integrations/quickbooks/sync"
                className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Sync now
              </a>
            ) : (
              <a
                href="/api/integrations/quickbooks/connect"
                className="inline-flex items-center px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Connect
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
