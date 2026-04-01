import crypto from 'crypto'

const QB_CLIENT_ID = process.env.QB_CLIENT_ID!
const QB_CLIENT_SECRET = process.env.QB_CLIENT_SECRET!
const QB_REDIRECT_URI = process.env.QB_REDIRECT_URI!

const QB_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2'
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

const QB_API_BASE =
  process.env.QB_SANDBOX === 'true'
    ? 'https://sandbox-quickbooks.api.intuit.com/v3/company'
    : 'https://quickbooks.api.intuit.com/v3/company'

// ────────────────────────────────────────────────────────────
// OAuth
// ────────────────────────────────────────────────────────────

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: QB_CLIENT_ID,
    redirect_uri: QB_REDIRECT_URI,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state,
  })
  return `${QB_AUTH_URL}?${params.toString()}`
}

export interface QBTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  x_refresh_token_expires_in: number
  token_type: string
}

export async function exchangeCodeForTokens(code: string): Promise<QBTokenResponse> {
  const credentials = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(QB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: QB_REDIRECT_URI,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`QB token exchange failed: ${res.status} ${text}`)
  }
  return res.json()
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<Pick<QBTokenResponse, 'access_token' | 'refresh_token' | 'expires_in'>> {
  const credentials = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(QB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`QB token refresh failed: ${res.status} ${text}`)
  }
  return res.json()
}

// ────────────────────────────────────────────────────────────
// Invoice API
// ────────────────────────────────────────────────────────────

export interface QBInvoice {
  Id: string
  DocNumber: string
  TxnDate: string
  DueDate?: string
  TotalAmt: number
  Balance: number
  CurrencyRef?: { value: string; name?: string }
  CustomerRef: { value: string; name?: string }
  CustomerMemo?: { value: string }
  BillEmail?: { Address: string }
}

export async function fetchQBInvoices(
  accessToken: string,
  realmId: string,
): Promise<QBInvoice[]> {
  // Fetch open invoices (Balance > 0) and recently paid ones
  const query = `SELECT * FROM Invoice WHERE Balance >= '0' MAXRESULTS 1000`
  const url = `${QB_API_BASE}/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`QB invoice fetch failed: ${res.status} ${text}`)
  }
  const json = await res.json()
  return json.QueryResponse?.Invoice ?? []
}

export function mapQBStatus(invoice: QBInvoice): 'sent' | 'overdue' | 'paid' {
  if (invoice.Balance === 0) return 'paid'
  if (invoice.DueDate && new Date(invoice.DueDate) < new Date()) return 'overdue'
  return 'sent'
}

// ────────────────────────────────────────────────────────────
// Encryption (AES-256-GCM)
// Derives a 32-byte key from TOKEN_ENCRYPTION_KEY via SHA-256.
// Format: iv_hex:tag_hex:ciphertext_hex
// ────────────────────────────────────────────────────────────

function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(process.env.TOKEN_ENCRYPTION_KEY!).digest()
}

export function encrypt(text: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(':')
  const key = getEncryptionKey()
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}
