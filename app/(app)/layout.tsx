import { Sidebar } from '@/components/layout/Sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('plan, trial_ends_at')
      .eq('id', user.id)
      .single()

    const plan = userData?.plan ?? 'trial'
    const trialEndsAt = userData?.trial_ends_at ? new Date(userData.trial_ends_at) : null
    const trialExpired = plan === 'trial' && trialEndsAt && trialEndsAt < new Date()

    if (trialExpired || plan === 'cancelled') {
      const headersList = await headers()
      const pathname = headersList.get('x-pathname') ?? ''
      const isSettingsPage = pathname.startsWith('/settings')
      if (!isSettingsPage) {
        redirect('/settings/billing')
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
