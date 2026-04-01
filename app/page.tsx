import type { Metadata } from 'next'
import { WaitlistForm } from '@/components/marketing/WaitlistForm'

export const metadata: Metadata = {
  title: 'Settled — Get paid without the awkward conversation',
  description:
    'Settled sends professional, escalating follow-ups on overdue invoices so you never have to chase a client again. Built for agencies, consultants, and contractors.',
  openGraph: {
    title: 'Settled — Get paid without the awkward conversation',
    description:
      'Stop chasing invoices. Settled automates professional follow-ups so you get paid faster — without the awkward conversation.',
    type: 'website',
    url: 'https://getsettled.app',
    siteName: 'Settled',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Settled — Automated invoice follow-up',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Settled — Get paid without the awkward conversation',
    description: 'Stop chasing invoices. Settled automates professional follow-ups so you get paid faster.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://getsettled.app',
  },
}

export default function MarketingPage() {
  return (
    <div className="font-sans antialiased bg-white text-gray-900">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-lg tracking-tight">Settled</span>
          </div>
          <a
            href="#waitlist"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            Get early access
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="pt-28 pb-20 px-5"
        style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #f0f9ff 100%)' }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100 text-brand-700 text-sm font-medium mb-8">
            <span className="inline-block w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            Early access — $199/mo (regular price $299/mo)
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Get paid without
            <br className="hidden sm:block" />
            <span className="text-brand-600"> the awkward conversation</span>
          </h1>

          <p className="text-xl text-gray-600 leading-relaxed mb-10 max-w-2xl mx-auto">
            Settled sends professional, escalating follow-ups on your overdue invoices — so you never have to chase
            a client again. Built for agencies, consultants, and contractors.
          </p>

          {/* Waitlist Form — Hero */}
          <div className="max-w-lg mx-auto" id="waitlist">
            <WaitlistForm formId="hero" />
          </div>
        </div>
      </section>

      {/* Social proof numbers */}
      <section className="py-14 px-5 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { stat: '$18K–$40K', label: 'average annual revenue lost to late or uncollected invoices' },
              { stat: '3–5 hrs', label: 'wasted per month by owners personally chasing overdue clients' },
              {
                stat: '48 hrs',
                label: 'average time-to-pay when someone reaches out personally vs. a generic reminder',
              },
            ].map(({ stat, label }) => (
              <div
                key={stat}
                className="rounded-2xl p-6 border border-gray-100 shadow-sm"
                style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }}
              >
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat}</div>
                <div className="text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain points */}
      <section className="py-20 px-5 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            QuickBooks reminders get ignored.
            <br />
            Your calls don&apos;t.
          </h2>
          <p className="text-center text-gray-500 text-lg mb-14 max-w-xl mx-auto">
            The problem isn&apos;t invoicing. It&apos;s the follow-up — and existing tools don&apos;t get it right.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center mb-5">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Generic reminders go straight to trash</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Your clients know a QuickBooks auto-reminder when they see one. They ignore it — every time. A
                human-sounding message that references their specific invoice? That gets read.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center mb-5">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">You&apos;re their interest-free bank</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Every day a payment sits overdue is a day you&apos;re financing your client&apos;s business. The average
                service business writes off $18K–$40K/year in late or uncollected revenue. That ends now.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center mb-5">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Following up feels humiliating</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                You did the work. You invoiced. Now you&apos;re supposed to beg? Settled handles the entire follow-up
                sequence — professionally, persistently, and without ever making you feel like a pushover.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-5 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">How Settled works</h2>
          <p className="text-center text-gray-500 text-lg mb-14 max-w-xl mx-auto">
            Connect your invoicing tool once. Settled takes it from there.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Connect QuickBooks or FreshBooks',
                desc: 'One-click OAuth. Settled reads your invoice aging in real time — no manual uploads, no CSV exports.',
              },
              {
                step: '2',
                title: 'Set your follow-up rules',
                desc: 'Choose when to escalate, how firm to get, and which clients are exempt. Your tone, your rules — Settled executes.',
              },
              {
                step: '3',
                title: 'Get paid, not excuses',
                desc: 'Settled escalates automatically — from a gentle nudge on day 7 to a firm request on day 30. You get notified when payment arrives.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 border-2 border-brand-200 flex items-center justify-center mx-auto mb-4 text-brand-700 font-bold text-lg">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof quotes */}
      <section className="py-16 px-5 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">We&apos;ve heard it over and over</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                quote:
                  '"I do the work, I invoice the same day, and then I sit here waiting while they float my money. I\'m basically their interest-free bank."',
                name: 'Marcus R.',
                role: 'HVAC Contractor, $320K revenue',
                initial: 'M',
              },
              {
                quote:
                  '"I hate asking for money. It makes me feel like I\'m begging. But it\'s my money — I already did the work."',
                name: 'Diana K.',
                role: 'Marketing Consultant, $680K revenue',
                initial: 'D',
              },
              {
                quote:
                  '"Missing payroll — even once — changes how you feel about your business. That was a $40,000 late payment from a client I\'d invoiced 45 days prior."',
                name: 'Joel F.',
                role: 'Web Agency Owner, $780K revenue',
                initial: 'J',
              },
              {
                quote:
                  '"If it\'s better than what I\'m getting from my bookkeeper on the AR side, absolutely. That\'s a third of what I\'m already paying."',
                name: 'Joel F.',
                role: 'Web Agency Owner, already paying $900/mo for AR',
                initial: 'J',
              },
            ].map(({ quote, name, role, initial }, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <p className="text-gray-600 text-sm leading-relaxed mb-4">{quote}</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                    {initial}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{name}</div>
                    <div className="text-xs text-gray-500">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-5 bg-white">
        <div className="max-w-lg mx-auto text-center">
          <div className="rounded-2xl border-2 border-brand-200 bg-brand-50 p-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-600 text-white text-xs font-semibold mb-6">
              EARLY ACCESS PRICING
            </div>
            <div className="mb-2">
              <span className="text-5xl font-bold text-gray-900">$199</span>
              <span className="text-gray-500">/month</span>
            </div>
            <p className="text-gray-500 text-sm mb-1">Early access price — locks in permanently</p>
            <p className="text-gray-400 text-xs mb-8">Regular price $299/mo after launch</p>

            <ul className="text-left space-y-3 mb-8 text-sm text-gray-700">
              {[
                'QuickBooks & FreshBooks integration',
                'Escalating email + SMS follow-up sequences',
                'Tone calibration (professional → firm → urgent)',
                'Real-time AR dashboard + invoice status tracking',
                'Client exemption list (VIP clients, paused accounts)',
                'Unlimited invoices',
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <WaitlistForm formId="pricing" variant="pricing" />
            <p className="mt-3 text-xs text-gray-400">No credit card required to join waitlist.</p>
          </div>

          <p className="mt-8 text-sm text-gray-500">
            Think about it: if Settled recovers even <strong>one invoice per month</strong>, it pays for itself 10×
            over.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-5 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">Common questions</h2>
          <div className="space-y-5">
            {[
              {
                q: "Will my clients know they're being followed up by software?",
                a: 'No. Settled sends messages that read as coming from you personally. Each follow-up references the specific invoice, project name, and amount owed — it does not read as an automated system.',
              },
              {
                q: 'What invoicing tools does it connect to?',
                a: 'QuickBooks Online and FreshBooks at launch. Xero, Harvest, and Stripe Invoicing are on the roadmap for Q3.',
              },
              {
                q: 'Can I pause follow-ups for specific clients?',
                a: 'Yes. You can exempt specific clients, pause all follow-ups for an account, or manually override the tone for sensitive relationships.',
              },
              {
                q: "What's the ROI?",
                a: 'Agencies in our research averaged $18K–$40K in late or lost revenue per year. At $199/mo ($2,388/year), recovering even one mid-sized invoice covers your annual subscription and then some.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">{q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-5 bg-brand-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Stop being their bank.</h2>
          <p className="text-brand-100 text-lg mb-8">
            Join agencies and consultants who are done chasing invoices manually.
          </p>
          <div className="max-w-md mx-auto">
            <WaitlistForm formId="footer" variant="footer" />
          </div>
          <p className="mt-4 text-brand-200 text-sm">
            No credit card required &bull; Cancel anytime &bull; Early access: $199/mo
          </p>
        </div>
      </section>

      <footer className="py-8 px-5 bg-gray-900 text-center text-gray-500 text-sm">
        <p>
          &copy; 2026 Settled. Built for agencies, consultants, and contractors who are done waiting to get paid.
        </p>
      </footer>
    </div>
  )
}
