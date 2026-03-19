export const dynamic = 'force-dynamic'

/**
 * /create — Create a new AI Agent Channel
 *
 * Server Component: fetches user profile, checks auth, renders client form.
 * All data mutations go through Server Actions.
 */

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { CreateChannelForm } from '@/components/channel/create-channel-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Channel — Timpa',
  description: 'Launch your own gated AI agent channel. Set your persona, rate, and start earning.',
}

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/create')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url, wallet_address')
    .eq('id', user.id)
    .single()

  return { user, profile }
}

export default async function CreatePage() {
  const { user, profile } = await getUser()

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">

        {/* Header */}
        <div className="mb-10 space-y-2">
          <p className="text-sm font-medium text-primary uppercase tracking-widest">
            New Channel
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Launch your AI agent
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Configure your agent persona, connect your LLM API key, and set a
            streaming rate. Subscribers pay per minute to access your live channel.
          </p>
        </div>

        {/* Wallet warning if no wallet connected */}
        {!profile?.wallet_address && (
          <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
            Connect a wallet in your profile to receive ETH payments from your channel.
          </div>
        )}

        <CreateChannelForm userId={user.id} />
      </div>
    </main>
  )
}
