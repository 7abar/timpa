export const dynamic = 'force-dynamic'

/**
 * Channel Room — protected, gated by active stream
 * 3-column layout: sidebar | chat | right panel
 */
import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Channel, Subscription } from '@/types'
import { RoomClient } from './room-client'

interface RoomPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: RoomPageProps) {
  const { slug } = await params
  return { title: `${slug} — Live Room` }
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?redirectTo=/channel/${slug}/room`)
  }

  // Fetch channel
  const { data: channel } = await supabase
    .from('channels')
    .select('*, creator:profiles(id, username, avatar_url, bio, wallet_address)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!channel) notFound()

  // Check active subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('channel_id', channel.id)
    .eq('subscriber_id', user.id)
    .in('status', ['active', 'paused'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!subscription) {
    redirect(`/channel/${slug}`)
  }

  return (
    <RoomClient
      channel={channel as unknown as Channel}
      subscription={subscription as unknown as Subscription}
      currentUserId={user.id}
    />
  )
}
