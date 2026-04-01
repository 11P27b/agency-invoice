export type UserPlan = 'trial' | 'early_access' | 'standard' | 'cancelled'
export type InvoiceStatus = 'draft' | 'sent' | 'overdue' | 'partial' | 'paid' | 'cancelled'
export type InvoiceSource = 'manual' | 'quickbooks' | 'freshbooks'
export type FollowUpTone = 'friendly' | 'firm' | 'final'
export type AttemptStatus = 'scheduled' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed' | 'skipped'
export type IntegrationProvider = 'quickbooks' | 'freshbooks'
export type IntegrationStatus = 'active' | 'expired' | 'disconnected'

export interface DbUser {
  id: string
  email: string
  name: string | null
  company_name: string | null
  stripe_customer_id: string | null
  plan: UserPlan
  trial_ends_at: string | null
  created_at: string
}

export interface DbWorkspace {
  id: string
  owner_user_id: string
  name: string
  created_at: string
}

export interface DbClient {
  id: string
  workspace_id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  created_at: string
}

export interface DbInvoice {
  id: string
  workspace_id: string
  client_id: string
  invoice_number: string
  amount_cents: number
  currency: string
  due_date: string
  status: InvoiceStatus
  source: InvoiceSource
  source_id: string | null
  notes: string | null
  follow_up_paused: boolean
  created_at: string
  updated_at: string
}

export interface DbFollowUpSequence {
  id: string
  workspace_id: string
  name: string
  is_default: boolean
  created_at: string
}

export interface DbFollowUpStep {
  id: string
  sequence_id: string
  step_order: number
  days_after_due: number
  tone: FollowUpTone
  subject_template: string
  body_template: string
}

export interface DbFollowUpAttempt {
  id: string
  invoice_id: string
  step_id: string
  scheduled_at: string
  sent_at: string | null
  status: AttemptStatus
  resend_message_id: string | null
  error: string | null
  created_at: string
}

export interface DbIntegration {
  id: string
  workspace_id: string
  provider: IntegrationProvider
  access_token_encrypted: string
  refresh_token_encrypted: string
  token_expires_at: string | null
  realm_id: string | null
  last_synced_at: string | null
  status: IntegrationStatus
  created_at: string
}

// Joined types for UI
export interface InvoiceWithClient extends DbInvoice {
  client: DbClient
  latest_attempt?: DbFollowUpAttempt | null
}
