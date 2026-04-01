'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '⬜' },
  { href: '/invoices', label: 'Invoices', icon: '📄' },
  { href: '/clients', label: 'Clients', icon: '👤' },
  { href: '/sequences', label: 'Sequences', icon: '📧' },
  { href: '/analytics', label: 'Analytics', icon: '📊' },
  { href: '/feedback', label: 'Feedback', icon: '💬' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="w-56 min-h-screen bg-gray-900 flex flex-col">
      <div className="px-5 py-6 border-b border-gray-800">
        <h1 className="text-white font-bold text-xl">Settled</h1>
        <p className="text-gray-400 text-xs mt-0.5">Invoice follow-up, automated</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <span>🚪</span>
          Sign out
        </button>
      </div>
    </div>
  )
}
