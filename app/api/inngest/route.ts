import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { overdueCheck, followupSchedule, followupSend } from '@/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [overdueCheck, followupSchedule, followupSend],
})
