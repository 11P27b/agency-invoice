import Handlebars from 'handlebars'
import { Resend } from 'resend'
import { formatCurrency, formatDate, daysOverdue } from './utils'
import type { DbFollowUpStep, DbInvoice, DbClient } from '@/types/database'

export async function sendWelcomeEmail(
  toEmail: string,
  name: string | null
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const firstName = name ? name.split(' ')[0] : 'there'

  await resend.emails.send({
    from: `Settled <${process.env.RESEND_FROM_EMAIL ?? 'hello@settled.app'}>`,
    to: toEmail,
    subject: 'Welcome to Settled — your 7-day trial has started',
    text: `Hi ${firstName},

Welcome to Settled! Your 7-day free trial is now active.

Here's how to get started in 3 steps:

1. Add your first client — go to Clients and add a client you invoice regularly.
2. Create an invoice — add an outstanding invoice for that client.
3. Review your follow-up sequence — we've pre-loaded a 3-step sequence (Day 1, Day 7, Day 14). Customise the tone and timing anytime under Sequences.

Once you have an overdue invoice, Settled will automatically queue follow-up emails — no manual chasing required.

Questions? Just reply to this email — I read every response personally.

Best,
The Settled Team

---
Early Access is $199/mo after your trial. Cancel anytime.
`,
  })
}

export function renderTemplate(template: string, data: Record<string, string>): string {
  const compiled = Handlebars.compile(template)
  return compiled(data)
}

export function buildTemplateData(
  invoice: DbInvoice,
  client: DbClient,
  senderName: string
): Record<string, string> {
  return {
    client_name: client.name,
    client_email: client.email,
    amount: formatCurrency(invoice.amount_cents, invoice.currency),
    invoice_number: invoice.invoice_number,
    due_date: formatDate(invoice.due_date),
    days_overdue: String(daysOverdue(invoice.due_date)),
    sender_name: senderName,
  }
}

export async function sendFollowUpEmail(
  step: DbFollowUpStep,
  invoice: DbInvoice,
  client: DbClient,
  senderName: string,
  senderEmail: string
): Promise<{ messageId: string }> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const data = buildTemplateData(invoice, client, senderName)

  const subject = renderTemplate(step.subject_template, data)
  const text = renderTemplate(step.body_template, data)

  const result = await resend.emails.send({
    from: `${senderName} <${senderEmail}>`,
    to: client.email,
    subject,
    text,
  })

  if (result.error) throw new Error(result.error.message)
  return { messageId: result.data!.id }
}
