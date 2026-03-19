export const dynamic = 'force-dynamic'

/**
 * Create Channel Page (Protected)
 */
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CreateChannelForm } from '@/components/channel/create-channel-form'

export const metadata = {
  title: 'Create Channel',
  description: 'Launch your AI Agent channel on Timpa',
}

export default async function CreatePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirectTo=/create')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Your Channel</h1>
        <p className="text-muted-foreground mt-1">
          Launch your AI Agent and start earning ETH per minute
        </p>
      </div>

      <CreateChannelForm />
    </div>
  )
}
