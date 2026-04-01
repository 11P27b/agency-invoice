import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const PLAN_LABELS: Record<string, string> = {
  trial: 'Free Trial',
  early_access: 'Early Access',
  standard: 'Standard',
  cancelled: 'Cancelled',
}

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from('users')
    .select('plan, trial_ends_at, stripe_customer_id, name, email, company_name')
    .eq('id', user!.id)
    .single()

  const plan = userData?.plan ?? 'trial'
  const trialEndsAt = userData?.trial_ends_at ? new Date(userData.trial_ends_at) : null
  const now = new Date()
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0
  const trialExpired = plan === 'trial' && trialEndsAt && trialEndsAt < now

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Settings nav tabs */}
      <div className="flex gap-1 mb-8 border-b border-gray-200">
        <Link
          href="/settings/billing"
          className="px-4 py-2 text-sm font-medium text-indigo-600 border-b-2 border-indigo-600 -mb-px"
        >
          Billing
        </Link>
        <Link
          href="/settings/integrations"
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Integrations
        </Link>
      </div>

      {/* Trial expired banner */}
      {trialExpired && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800">Your free trial has ended</p>
          <p className="text-sm text-amber-700 mt-1">
            Upgrade to Early Access to continue using Settled and keep your data.
          </p>
        </div>
      )}

      {/* Current plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Current plan</p>
            <p className="text-xl font-bold text-gray-900">{PLAN_LABELS[plan] ?? plan}</p>
            {plan === 'trial' && trialEndsAt && !trialExpired && (
              <p className="text-sm text-gray-500 mt-1">
                {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining in your free trial
              </p>
            )}
            {plan === 'early_access' && (
              <p className="text-sm text-gray-500 mt-1">$199/mo · Early access pricing</p>
            )}
          </div>
          {plan === 'early_access' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Upgrade / manage */}
      {(plan === 'trial' || plan === 'cancelled') && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">Upgrade to Early Access</h2>
          <p className="text-sm text-gray-600 mb-1">$199/mo · Cancel anytime</p>
          <ul className="text-sm text-gray-600 space-y-1 mb-4">
            <li>✓ Unlimited invoices and clients</li>
            <li>✓ Automated follow-up sequences</li>
            <li>✓ QuickBooks sync</li>
            <li>✓ Priority support</li>
          </ul>
          <form action="/api/billing/checkout" method="POST">
            <button
              type="submit"
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Upgrade now — $199/mo
            </button>
          </form>
        </div>
      )}

      {plan === 'early_access' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Manage subscription</h2>
          <p className="text-sm text-gray-500 mb-4">
            Update your payment method, view invoices, or cancel your subscription.
          </p>
          <form action="/api/billing/portal" method="POST">
            <button
              type="submit"
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Open billing portal
            </button>
          </form>
        </div>
      )}

      {/* Account info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Account</h2>
        <dl className="space-y-3">
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Name</dt>
            <dd className="text-gray-900 font-medium">{userData?.name ?? '—'}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-900">{userData?.email ?? user!.email}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Business</dt>
            <dd className="text-gray-900">{userData?.company_name ?? '—'}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
