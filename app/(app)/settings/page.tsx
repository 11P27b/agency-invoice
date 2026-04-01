import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  redirect('/settings/billing')
}
