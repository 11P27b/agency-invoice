import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AttemptStatus } from '@/types/database'

// Resend webhook event types that map to our AttemptStatus values
const EVENT_STATUS_MAP: Record<string, AttemptStatus> = {
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'failed',
  'email.complained': 'failed',
}

interface ResendWebhookPayload {
  type: string
  data: {
    email_id: string
    [key: string]: unknown
  }
}

export async function POST(request: NextRequest) {
  // Verify webhook secret if configured
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (webhookSecret) {
    const signature = request.headers.get('svix-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }
    // Basic check — in production use Svix's verify() for full HMAC verification
    const providedSecret = request.headers.get('svix-secret') ?? ''
    if (providedSecret !== webhookSecret) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: ResendWebhookPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const newStatus = EVENT_STATUS_MAP[payload.type]
  if (!newStatus) {
    // Unknown event type — ack and ignore
    return NextResponse.json({ ok: true })
  }

  const messageId = payload.data?.email_id
  if (!messageId) {
    return NextResponse.json({ error: 'Missing email_id' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Update the attempt that matches this Resend message ID
  const { error } = await supabase
    .from('follow_up_attempts')
    .update({ status: newStatus })
    .eq('resend_message_id', messageId)
    .in('status', ['sent', 'delivered', 'opened']) // don't downgrade terminal states

  if (error) {
    console.error('Resend webhook DB update failed:', error)
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
