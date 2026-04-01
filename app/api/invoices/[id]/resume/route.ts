import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Un-pause the invoice (RLS ensures ownership)
  const { data, error } = await supabase
    .from('invoices')
    .update({ follow_up_paused: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Invoice not found' }, { status: 404 })
  }

  // If the invoice is still overdue, restart the follow-up sequence
  if (data.status === 'overdue') {
    // Check whether any non-terminal attempts already exist
    const { data: existing } = await supabase
      .from('follow_up_attempts')
      .select('id')
      .eq('invoice_id', id)
      .in('status', ['scheduled', 'sent', 'delivered', 'opened', 'clicked'])
      .limit(1)

    if (!existing?.length) {
      await inngest.send({
        name: 'settled/followup.schedule',
        data: { invoiceId: id },
      })
    }
  }

  return NextResponse.json({ ok: true, invoiceId: data.id, follow_up_paused: false })
}
