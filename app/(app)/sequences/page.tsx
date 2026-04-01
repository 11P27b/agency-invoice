import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function SequencesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_user_id', user!.id)
    .single()

  const { data: sequences } = await supabase
    .from('follow_up_sequences')
    .select('*, steps:follow_up_steps(*)')
    .eq('workspace_id', workspace!.id)
    .order('created_at', { ascending: true })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-up Sequences</h1>
          <p className="text-gray-500 mt-1">Configure automated follow-up email sequences</p>
        </div>
        <Link
          href="/sequences/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + New sequence
        </Link>
      </div>

      <div className="space-y-4">
        {!sequences || sequences.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center text-gray-400">
            <p className="text-lg">No sequences yet</p>
            <p className="text-sm mt-1">Your default sequence was created automatically on signup.</p>
          </div>
        ) : (
          sequences.map(seq => (
            <Link
              key={seq.id}
              href={`/sequences/${seq.id}`}
              className="block bg-white rounded-xl border border-gray-200 px-6 py-4 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-900">{seq.name}</h2>
                    {seq.is_default && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {seq.steps?.length ?? 0} step{(seq.steps?.length ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-gray-400 text-sm">Edit →</div>
              </div>

              {seq.steps && seq.steps.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {(seq.steps as { step_order: number; days_after_due: number; tone: string }[])
                    .sort((a, b) => a.step_order - b.step_order)
                    .map(step => (
                      <span
                        key={step.step_order}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600"
                      >
                        <span className="font-medium">Day {step.days_after_due}</span>
                        <span className="text-gray-400">·</span>
                        <span className="capitalize">{step.tone}</span>
                      </span>
                    ))}
                </div>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
