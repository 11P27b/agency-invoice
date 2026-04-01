import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, source } = body as { email?: unknown; source?: unknown }

  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const notifyEmail = process.env.WAITLIST_NOTIFY_EMAIL
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey || !notifyEmail) {
    // In dev without config, log and succeed silently
    console.log(`[waitlist] signup: ${email} (source: ${source ?? 'unknown'})`)
    return NextResponse.json({ ok: true })
  }

  const resend = new Resend(resendApiKey)

  try {
    // Notify the team
    await resend.emails.send({
      from: 'Settled Waitlist <waitlist@getsettled.app>',
      to: notifyEmail,
      subject: `New waitlist signup: ${email}`,
      html: `
        <p>New waitlist signup on <strong>Settled</strong>.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Source form:</strong> ${source ?? 'unknown'}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      `,
    })

    // Send confirmation to the user
    await resend.emails.send({
      from: 'Settled <hello@getsettled.app>',
      to: email,
      subject: "You're on the Settled waitlist",
      html: `
        <p>Hi there,</p>
        <p>Thanks for joining the Settled waitlist! We're excited to have you.</p>
        <p>
          <strong>What's next:</strong> We're onboarding early access customers now.
          We'll reach out personally when your spot opens up — typically within a few days.
        </p>
        <p>
          Early access is locked at <strong>$199/mo</strong> (regular price $299/mo after launch),
          and it locks in for as long as you stay subscribed.
        </p>
        <p>
          In the meantime, if you have questions just reply to this email.
        </p>
        <p>— The Settled Team</p>
      `,
    })
  } catch (err) {
    console.error('[waitlist] Resend error:', err)
    // Don't expose email errors to users — log and succeed
  }

  return NextResponse.json({ ok: true })
}
