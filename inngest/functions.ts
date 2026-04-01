import { inngest } from '@/lib/inngest'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendFollowUpEmail } from '@/lib/email'
import type { DbFollowUpStep, DbInvoice, DbClient } from '@/types/database'

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

/** Return a Date that is `days` calendar days after the given ISO date string. */
function addDays(isoDate: string, days: number): Date {
  const d = new Date(isoDate)
  d.setUTCDate(d.getUTCDate() + days)
  d.setUTCHours(9, 0, 0, 0) // fire at 09:00 UTC on that day
  return d
}

// ──────────────────────────────────────────────────────────────────────────
// 1. Daily overdue-check cron (8 AM UTC)
//    Finds invoices with status='sent' and due_date < today, marks them
//    overdue, then fires settled/followup.schedule for each.
// ──────────────────────────────────────────────────────────────────────────

export const overdueCheck = inngest.createFunction(
  { id: 'invoice-overdue-check', triggers: [{ cron: '0 8 * * *' }] },
  async ({ step }) => {
    const supabase = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // Find all sent invoices that are now overdue
    const fetchResult = await step.run('fetch-overdue-invoices', async () => {
      const res = await supabase
        .from('invoices')
        .select('id, workspace_id, due_date, follow_up_paused')
        .eq('status', 'sent')
        .lt('due_date', today)
      return { data: res.data, error: res.error?.message ?? null }
    })

    if (fetchResult.error || !fetchResult.data?.length) return { marked: 0, scheduled: 0 }

    const invoices = fetchResult.data as {
      id: string
      workspace_id: string
      due_date: string
      follow_up_paused: boolean
    }[]
    const invoiceIds = invoices.map((i) => i.id)

    // Mark them all overdue in one batch
    await step.run('mark-invoices-overdue', async () => {
      await supabase
        .from('invoices')
        .update({ status: 'overdue', updated_at: new Date().toISOString() })
        .in('id', invoiceIds)
    })

    // Find which of these already have an active attempt (avoid duplicate sequences)
    const existingResult = await step.run('fetch-existing-attempts', async () => {
      const res = await supabase
        .from('follow_up_attempts')
        .select('invoice_id')
        .in('invoice_id', invoiceIds)
        .in('status', ['scheduled', 'sent', 'delivered', 'opened', 'clicked'])
      return { data: res.data, error: res.error?.message ?? null }
    })

    const alreadyScheduled = new Set(
      (existingResult.data ?? []).map((a: { invoice_id: string }) => a.invoice_id)
    )

    // Fire followup.schedule for invoices not already in a sequence
    const toSchedule = invoices.filter(
      (inv) => !alreadyScheduled.has(inv.id) && !inv.follow_up_paused
    )

    if (toSchedule.length > 0) {
      await step.sendEvent(
        'send-followup-schedule-events',
        toSchedule.map((inv) => ({
          name: 'settled/followup.schedule' as const,
          data: { invoiceId: inv.id },
        }))
      )
    }

    return { marked: invoiceIds.length, scheduled: toSchedule.length }
  }
)

// ──────────────────────────────────────────────────────────────────────────
// 2. Follow-up scheduler
//    Triggered once per invoice. Walks through all steps of the workspace's
//    default sequence, sleeping until each step's scheduled date then
//    firing settled/followup.send.
// ──────────────────────────────────────────────────────────────────────────

export const followupSchedule = inngest.createFunction(
  { id: 'followup-schedule', triggers: [{ event: 'settled/followup.schedule' }] },
  async ({ event, step }) => {
    const { invoiceId } = event.data as { invoiceId: string }
    const supabase = createAdminClient()

    // Fetch invoice + workspace default sequence steps
    const ctx = await step.run('fetch-invoice-and-steps', async () => {
      const invRes = await supabase
        .from('invoices')
        .select('id, workspace_id, due_date, status, follow_up_paused')
        .eq('id', invoiceId)
        .single()

      if (invRes.error || !invRes.data) throw new Error(`Invoice ${invoiceId} not found`)
      const inv = invRes.data as {
        id: string
        workspace_id: string
        due_date: string
        status: string
        follow_up_paused: boolean
      }
      if (inv.status !== 'overdue') return { invoice: inv, steps: [] as DbFollowUpStep[] }

      const seqRes = await supabase
        .from('follow_up_sequences')
        .select('id')
        .eq('workspace_id', inv.workspace_id)
        .eq('is_default', true)
        .single()

      if (!seqRes.data) return { invoice: inv, steps: [] as DbFollowUpStep[] }

      const stepsRes = await supabase
        .from('follow_up_steps')
        .select('*')
        .eq('sequence_id', seqRes.data.id)
        .order('step_order', { ascending: true })

      return { invoice: inv, steps: (stepsRes.data ?? []) as DbFollowUpStep[] }
    })

    if (!ctx.steps.length) return { skipped: true, reason: 'no steps or invoice not overdue' }

    // Walk each step
    for (const stepRow of ctx.steps) {
      const scheduledAt = addDays(ctx.invoice.due_date, stepRow.days_after_due)
      const stepKey = `step-${stepRow.step_order}`

      // Create attempt record (idempotent: skip if already exists for this step)
      const attemptId = await step.run(`create-attempt-${stepKey}`, async () => {
        const existingRes = await supabase
          .from('follow_up_attempts')
          .select('id')
          .eq('invoice_id', invoiceId)
          .eq('step_id', stepRow.id)
          .not('status', 'in', '(failed,skipped)')
          .maybeSingle()

        if (existingRes.data) return existingRes.data.id as string

        const insertRes = await supabase
          .from('follow_up_attempts')
          .insert({
            invoice_id: invoiceId,
            step_id: stepRow.id,
            scheduled_at: scheduledAt.toISOString(),
            status: 'scheduled',
          })
          .select('id')
          .single()

        if (insertRes.error || !insertRes.data) {
          throw new Error(`Failed to create attempt for step ${stepRow.id}: ${insertRes.error?.message}`)
        }
        return insertRes.data.id as string
      })

      // Sleep until the scheduled send time
      await step.sleepUntil(`sleep-until-${stepKey}`, scheduledAt)

      // Re-check invoice state after waking
      const checkResult = await step.run(`check-send-${stepKey}`, async () => {
        const res = await supabase
          .from('invoices')
          .select('status, follow_up_paused')
          .eq('id', invoiceId)
          .single()
        if (!res.data) return { shouldSend: false, reason: 'invoice_not_found' }
        const inv = res.data as { status: string; follow_up_paused: boolean }
        if (inv.status === 'paid' || inv.status === 'cancelled') {
          return { shouldSend: false, reason: `invoice_${inv.status}` }
        }
        if (inv.follow_up_paused) return { shouldSend: false, reason: 'paused' }
        return { shouldSend: true, reason: 'ok' }
      })

      if (!checkResult.shouldSend) {
        await step.run(`skip-attempt-${stepKey}`, async () => {
          await supabase
            .from('follow_up_attempts')
            .update({ status: 'skipped', error: checkResult.reason })
            .eq('id', attemptId)
        })
        // Stop sequence entirely if invoice is paid/cancelled
        if (checkResult.reason === 'invoice_paid' || checkResult.reason === 'invoice_cancelled') {
          break
        }
        continue
      }

      // Dispatch the send event
      await step.sendEvent(`send-followup-${stepKey}`, {
        name: 'settled/followup.send' as const,
        data: { invoiceId, stepId: stepRow.id, attemptId },
      })
    }

    return { invoiceId, stepsScheduled: ctx.steps.length }
  }
)

// ──────────────────────────────────────────────────────────────────────────
// 3. Follow-up sender
//    Triggered per step by followup.schedule (or manually). Sends the
//    follow-up email and updates the attempt record.
// ──────────────────────────────────────────────────────────────────────────

export const followupSend = inngest.createFunction(
  { id: 'followup-send', triggers: [{ event: 'settled/followup.send' }] },
  async ({ event, step }) => {
    const { invoiceId, stepId, attemptId } = event.data as {
      invoiceId: string
      stepId: string
      attemptId: string
    }
    const supabase = createAdminClient()

    // Fetch all required data
    const sendData = await step.run('fetch-send-data', async () => {
      const invRes = await supabase
        .from('invoices')
        .select('*, client:clients(*)')
        .eq('id', invoiceId)
        .single()
      if (!invRes.data) throw new Error(`Invoice ${invoiceId} not found`)

      const stepRes = await supabase
        .from('follow_up_steps')
        .select('*')
        .eq('id', stepId)
        .single()
      if (!stepRes.data) throw new Error(`Step ${stepId} not found`)

      const wsRes = await supabase
        .from('workspaces')
        .select('owner_user_id')
        .eq('id', (invRes.data as { workspace_id: string }).workspace_id)
        .single()

      const userRes = wsRes.data
        ? await supabase
            .from('users')
            .select('name, email')
            .eq('id', wsRes.data.owner_user_id)
            .single()
        : { data: null }

      return {
        invoice: invRes.data as DbInvoice & { client: DbClient },
        followUpStep: stepRes.data as DbFollowUpStep,
        senderName: (userRes.data as { name: string | null; email: string } | null)?.name ?? 'Settled',
        senderEmail:
          (userRes.data as { name: string | null; email: string } | null)?.email ??
          process.env.RESEND_FROM_EMAIL ??
          'hello@settled.app',
      }
    })

    // Guard: skip if invoice no longer overdue or is paused
    const sendable = await step.run('check-invoice-sendable', async () => {
      const res = await supabase
        .from('invoices')
        .select('status, follow_up_paused')
        .eq('id', invoiceId)
        .single()
      const inv = res.data as { status: string; follow_up_paused: boolean } | null
      return inv?.status === 'overdue' && !inv.follow_up_paused
    })

    if (!sendable) {
      await step.run('skip-attempt', async () => {
        await supabase
          .from('follow_up_attempts')
          .update({ status: 'skipped', error: 'invoice_not_sendable' })
          .eq('id', attemptId)
      })
      return { skipped: true }
    }

    // Send the email
    const messageId = await step.run('send-email', async () => {
      const { messageId: id } = await sendFollowUpEmail(
        sendData.followUpStep,
        sendData.invoice as unknown as DbInvoice,
        sendData.invoice.client,
        sendData.senderName,
        sendData.senderEmail
      )
      return id
    })

    // Update attempt to sent
    await step.run('update-attempt-sent', async () => {
      await supabase
        .from('follow_up_attempts')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          resend_message_id: messageId,
        })
        .eq('id', attemptId)
    })

    return { sent: true, messageId }
  }
)
