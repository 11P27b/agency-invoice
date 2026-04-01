import { createClient } from '@/lib/supabase/server'
import {
  decrypt,
  encrypt,
  fetchQBInvoices,
  mapQBStatus,
  refreshAccessToken,
  QBInvoice,
} from '@/lib/quickbooks'
import { NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  if (!workspace) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
  }

  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('provider', 'quickbooks')
    .single()

  if (!integration) {
    return NextResponse.redirect(`${APP_URL}/settings/integrations?error=not_connected`)
  }

  // ── Token refresh if expired (or within 5 min of expiry) ──
  let accessToken = decrypt(integration.access_token_encrypted)
  const refreshToken = decrypt(integration.refresh_token_encrypted)

  const expiresAt = integration.token_expires_at
    ? new Date(integration.token_expires_at).getTime()
    : 0
  if (Date.now() >= expiresAt - 5 * 60 * 1000) {
    let refreshed
    try {
      refreshed = await refreshAccessToken(refreshToken)
    } catch {
      await supabase
        .from('integrations')
        .update({ status: 'expired' })
        .eq('id', integration.id)
      return NextResponse.redirect(`${APP_URL}/settings/integrations?error=token_expired`)
    }

    accessToken = refreshed.access_token
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

    await supabase
      .from('integrations')
      .update({
        access_token_encrypted: encrypt(refreshed.access_token),
        refresh_token_encrypted: encrypt(refreshed.refresh_token),
        token_expires_at: newExpiresAt,
        status: 'active',
      })
      .eq('id', integration.id)
  }

  // ── Fetch invoices from QuickBooks ──
  let qbInvoices: QBInvoice[]
  try {
    qbInvoices = await fetchQBInvoices(accessToken, integration.realm_id)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch QuickBooks invoices' }, { status: 502 })
  }

  if (qbInvoices.length === 0) {
    await supabase
      .from('integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', integration.id)
    return NextResponse.redirect(`${APP_URL}/settings/integrations?synced=0`)
  }

  // ── Build a client lookup map (by QB customer name) ──
  const { data: existingClients } = await supabase
    .from('clients')
    .select('id, name, email')
    .eq('workspace_id', workspace.id)

  const clientByName = new Map<string, string>() // name → client id
  for (const c of existingClients ?? []) {
    clientByName.set(c.name.toLowerCase(), c.id)
  }

  // ── Upsert invoices ──
  let upsertedCount = 0
  for (const qbInv of qbInvoices) {
    const customerName = qbInv.CustomerRef?.name ?? 'Unknown Customer'
    const customerEmail =
      qbInv.BillEmail?.Address ?? `qb-${qbInv.CustomerRef.value}@imported.quickbooks`

    // Find or create client
    let clientId = clientByName.get(customerName.toLowerCase())
    if (!clientId) {
      const { data: newClient } = await supabase
        .from('clients')
        .insert({
          workspace_id: workspace.id,
          name: customerName,
          email: customerEmail,
        })
        .select('id')
        .single()

      if (!newClient) continue
      clientId = newClient.id as string
      clientByName.set(customerName.toLowerCase(), clientId)
    }

    const status = mapQBStatus(qbInv)
    const amountCents = Math.round(qbInv.TotalAmt * 100)
    const dueDate = qbInv.DueDate ?? qbInv.TxnDate
    const currency = qbInv.CurrencyRef?.value ?? 'USD'

    const { error } = await supabase.from('invoices').upsert(
      {
        workspace_id: workspace.id,
        client_id: clientId,
        invoice_number: qbInv.DocNumber,
        amount_cents: amountCents,
        currency,
        due_date: dueDate,
        status,
        source: 'quickbooks',
        source_id: qbInv.Id,
        notes: qbInv.CustomerMemo?.value ?? null,
      },
      { onConflict: 'workspace_id,source,source_id', ignoreDuplicates: false },
    )

    if (!error) upsertedCount++
  }

  // ── Update last_synced_at ──
  await supabase
    .from('integrations')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', integration.id)

  return NextResponse.redirect(`${APP_URL}/settings/integrations?synced=${upsertedCount}`)
}
