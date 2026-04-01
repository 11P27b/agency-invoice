import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendFollowUpEmail } from '@/lib/email'
import type { DbFollowUpStep, DbInvoice, DbClient } from '@/types/database'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { step_id } = body
  if (!step_id) return NextResponse.json({ error: 'step_id is required' }, { status: 400 })

  // Fetch invoice + client (RLS ensures ownership)
  const { data: invoice, error: invoiceErr } = await supabase
    .from('invoices')
    .select('*, client:clients(*)')
    .eq('id', id)
    .single()

  if (invoiceErr || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  // Fetch the step
  const { data: step, error: stepErr } = await supabase
    .from('follow_up_steps')
    .select('*')
    .eq('id', step_id)
    .single()

  if (stepErr || !step) {
    return NextResponse.json({ error: 'Step not found' }, { status: 404 })
  }

  // Sender info from user profile
  const { data: profile } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', user.id)
    .single()

  const senderName = profile?.name ?? user.email ?? 'Settled'
  const senderEmail = profile?.email ?? user.email!

  // Create attempt record (scheduled → sending)
  const { data: attempt, error: attemptErr } = await supabase
    .from('follow_up_attempts')
    .insert({
      invoice_id: id,
      step_id,
      scheduled_at: new Date().toISOString(),
      status: 'scheduled',
    })
    .select()
    .single()

  if (attemptErr || !attempt) {
    return NextResponse.json({ error: 'Failed to create attempt record' }, { status: 500 })
  }

  try {
    const { messageId } = await sendFollowUpEmail(
      step as DbFollowUpStep,
      invoice as unknown as DbInvoice,
      invoice.client as DbClient,
      senderName,
      senderEmail
    )

    // Mark attempt as sent
    await supabase
      .from('follow_up_attempts')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        resend_message_id: messageId,
      })
      .eq('id', attempt.id)

    return NextResponse.json({ ok: true, attemptId: attempt.id, messageId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Email send failed'

    // Mark attempt as failed
    await supabase
      .from('follow_up_attempts')
      .update({ status: 'failed', error: message })
      .eq('id', attempt.id)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
