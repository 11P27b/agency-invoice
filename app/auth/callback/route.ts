import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Send welcome email on first login (welcome_email_sent = false)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('email, name, welcome_email_sent')
            .eq('id', user.id)
            .single()

          if (profile && !profile.welcome_email_sent) {
            await sendWelcomeEmail(profile.email, profile.name)
            await supabase
              .from('users')
              .update({ welcome_email_sent: true })
              .eq('id', user.id)
          }
        }
      } catch {
        // Non-fatal — don't block login if welcome email fails
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`)
}
