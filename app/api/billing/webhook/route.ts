import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.supabase_user_id
      if (!userId) break

      const status = subscription.status
      const plan = status === 'active' || status === 'trialing' ? 'early_access' : 'cancelled'

      await supabase
        .from('users')
        .update({ plan })
        .eq('id', userId)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.supabase_user_id
      if (!userId) break

      await supabase
        .from('users')
        .update({ plan: 'cancelled' })
        .eq('id', userId)
      break
    }

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.subscription
        ? (await stripe.subscriptions.retrieve(session.subscription as string))
            .metadata?.supabase_user_id
        : null
      if (!userId) break

      await supabase
        .from('users')
        .update({ plan: 'early_access' })
        .eq('id', userId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
