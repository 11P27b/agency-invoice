import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('follow_up_steps')
    .select('*')
    .eq('sequence_id', id)
    .order('step_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { days_after_due, tone, subject_template, body_template } = body

  if (!days_after_due || !tone || !subject_template || !body_template) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get current max step_order
  const { data: existing } = await supabase
    .from('follow_up_steps')
    .select('step_order')
    .eq('sequence_id', id)
    .order('step_order', { ascending: false })
    .limit(1)

  const next_order = (existing?.[0]?.step_order ?? 0) + 1

  const { data, error } = await supabase
    .from('follow_up_steps')
    .insert({
      sequence_id: id,
      step_order: next_order,
      days_after_due,
      tone,
      subject_template,
      body_template,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
