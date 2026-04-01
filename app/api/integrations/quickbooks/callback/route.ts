import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, encrypt } from '@/lib/quickbooks'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const realmId = searchParams.get('realmId')

  if (!code || !state || !realmId) {
    return NextResponse.redirect(`${APP_URL}/settings/integrations?error=missing_params`)
  }

  // Validate CSRF state
  const cookieStore = await cookies()
  const savedState = cookieStore.get('qb_oauth_state')?.value
  cookieStore.delete('qb_oauth_state')
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/settings/integrations?error=invalid_state`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${APP_URL}/auth/login`)
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  if (!workspace) {
    return NextResponse.redirect(`${APP_URL}/settings/integrations?error=no_workspace`)
  }

  let tokens
  try {
    tokens = await exchangeCodeForTokens(code)
  } catch {
    return NextResponse.redirect(`${APP_URL}/settings/integrations?error=token_exchange_failed`)
  }

  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const { error } = await supabase.from('integrations').upsert(
    {
      workspace_id: workspace.id,
      provider: 'quickbooks',
      access_token_encrypted: encrypt(tokens.access_token),
      refresh_token_encrypted: encrypt(tokens.refresh_token),
      token_expires_at: tokenExpiresAt,
      realm_id: realmId,
      status: 'active',
    },
    { onConflict: 'workspace_id,provider' },
  )

  if (error) {
    return NextResponse.redirect(`${APP_URL}/settings/integrations?error=save_failed`)
  }

  return NextResponse.redirect(`${APP_URL}/settings/integrations?connected=1`)
}
