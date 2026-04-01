import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SequenceBuilder } from './SequenceBuilder'

export default async function SequencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: sequence, error } = await supabase
    .from('follow_up_sequences')
    .select('*, steps:follow_up_steps(*)')
    .eq('id', id)
    .single()

  if (error || !sequence) notFound()

  const steps = ((sequence.steps as unknown[]) ?? []).sort(
    (a: unknown, b: unknown) =>
      (a as { step_order: number }).step_order - (b as { step_order: number }).step_order
  )

  return <SequenceBuilder sequence={{ ...sequence, steps }} />
}
