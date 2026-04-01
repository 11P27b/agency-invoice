import type { Instrumentation } from 'next'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.SENTRY_DSN) {
    const Sentry = await import('@sentry/nextjs')
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    })
  }
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (!process.env.SENTRY_DSN) return
  const Sentry = await import('@sentry/nextjs')
  await Sentry.captureRequestError(err, request, context)
}
