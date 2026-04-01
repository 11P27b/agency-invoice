import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { nps_score, what_works_well, what_is_frustrating, what_would_drive_referral } = body

  if (typeof nps_score !== 'number' || nps_score < 1 || nps_score > 10) {
    return NextResponse.json({ error: 'nps_score must be between 1 and 10' }, { status: 400 })
  }

  const { error } = await supabase
    .from('feedback_responses')
    .insert({
      user_id: user.id,
      nps_score,
      what_works_well: what_works_well || null,
      what_is_frustrating: what_is_frustrating || null,
      what_would_drive_referral: what_would_drive_referral || null,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notify the team via email (non-fatal)
  if (process.env.RESEND_API_KEY && process.env.ADMIN_NOTIFICATION_EMAIL) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { data: profile } = await supabase
        .from('users')
        .select('email, name, company_name')
        .eq('id', user.id)
        .single()

      await resend.emails.send({
        from: `Settled <${process.env.RESEND_FROM_EMAIL ?? 'noreply@settled.app'}>`,
        to: process.env.ADMIN_NOTIFICATION_EMAIL,
        subject: `New beta feedback — NPS ${nps_score}/10 from ${profile?.company_name ?? profile?.email}`,
        text: [
          `From: ${profile?.name ?? 'Unknown'} <${profile?.email}> (${profile?.company_name ?? '—'})`,
          `NPS: ${nps_score}/10`,
          '',
          `What's working: ${what_works_well || '(skipped)'}`,
          '',
          `What's frustrating: ${what_is_frustrating || '(skipped)'}`,
          '',
          `What would drive referral: ${what_would_drive_referral || '(skipped)'}`,
        ].join('\n'),
      })
    } catch {
      // Non-fatal — response is still saved in DB
    }
  }

  return NextResponse.json({ ok: true })
}
