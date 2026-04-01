// Client-side analytics and error monitoring
// PostHog pageview tracking + error capture

export function onRouterTransitionStart() {
  if (typeof window !== 'undefined' && (window as any).__posthog) {
    ;(window as any).__posthog.capture('$pageview')
  }
}

// Initialize PostHog and Sentry on client boot
if (typeof window !== 'undefined') {
  const phKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const phHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

  if (phKey) {
    import('posthog-js').then(({ default: posthog }) => {
      posthog.init(phKey, {
        api_host: phHost,
        capture_pageview: false, // handled by onRouterTransitionStart
        capture_pageleave: true,
        persistence: 'localStorage+cookie',
      })
      ;(window as any).__posthog = posthog
    }).catch(() => {
      // posthog-js not installed yet — install with: npm install posthog-js
    })
  }
}
