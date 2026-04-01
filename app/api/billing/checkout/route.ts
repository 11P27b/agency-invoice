import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('email, name, stripe_customer_id')
    .eq('id', user.id)
    .single()

  // Reuse or create Stripe customer
  let customerId = userData?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData?.email ?? user.email!,
      name: userData?.name ?? undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: process.env.STRIPE_EARLY_ACCESS_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
  })

  return NextResponse.redirect(session.url!, 303)
}
