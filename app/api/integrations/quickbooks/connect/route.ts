import { createClient } from '@/lib/supabase/server'
import { buildAuthUrl } from '@/lib/quickbooks'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Generate CSRF state token and store in httpOnly cookie
  const state = crypto.randomBytes(16).toString('hex')
  const cookieStore = await cookies()
  cookieStore.set('qb_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return NextResponse.redirect(buildAuthUrl(state))
}
