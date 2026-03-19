export const dynamic = 'force-dynamic'

/**
 * Channel Detail Page (Server Component)
 * Shows channel info, teaser messages, and start stream CTA
 */
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Zap, Users, ArrowRight, Clock } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { formatEth, formatDate, formatNumber } from '@/lib/utils'
import { SubscriptionStatus } from '@/types'
import type { Channel, Message } from '@/types'
import { StartStreamButton } from './start-stream-button'

interface ChannelPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ChannelPageProps) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()
  const { data: channel } = await supabase
    .from('channels')
    .select('name, bio')
    .eq('slug', slug)
    .single()

  return {
    title: channel?.name ?? 'Channel',
    description: channel?.bio ?? undefined,
  }
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch channel
  const { data: channel } = await supabase
    .from('channels')
    .select('*, creator:profiles(id, username, avatar_url, bio)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!channel) notFound()

  const typedChannel = channel as unknown as Channel

  // Check if user has active subscription → redirect to room
  if (user) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('channel_id', channel.id)
      .eq('subscriber_id', user.id)
      .in('status', ['active', 'paused'])
      .maybeSingle()

    if (subscription) {
      redirect(`/channel/${slug}/room`)
    }
  }

  // Fetch teaser messages (last 5, public preview)
  const { data: teaserMessages } = await supabase
    .from('messages')
    .select('id, content, is_agent, created_at')
    .eq('channel_id', channel.id)
    .eq('is_agent', true)
    .order('created_at', { ascending: false })
    .limit(5)

  const messages = (teaserMessages as unknown as Message[]) ?? []

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        <Avatar className="h-20 w-20 border-2 border-timpa-gold/30 shrink-0">
          <AvatarImage src={typedChannel.creator?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-timpa-gold/20 text-timpa-gold text-2xl font-bold">
            {typedChannel.name[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">{typedChannel.name}</h1>
            <Badge variant="outline" className="text-timpa-gold border-timpa-gold/30">
              {typedChannel.provider}
            </Badge>
            <Badge variant="secondary">{typedChannel.model}</Badge>
          </div>

          <p className="text-muted-foreground mb-3">
            by{' '}
            <span className="text-foreground font-medium">
              @{typedChannel.creator?.username}
            </span>
          </p>

          {typedChannel.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              {typedChannel.bio}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{formatNumber(typedChannel.total_subscribers)} subscribers</span>
            </div>
            <div className="flex items-center gap-1.5 text-timpa-gold font-semibold">
              <Zap className="h-4 w-4" />
              <span>{formatEth(typedChannel.rate_eth_per_min)}/min</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Active since {formatDate(typedChannel.created_at)}</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 sm:items-end shrink-0">
          <StartStreamButton
            channel={typedChannel}
            isLoggedIn={!!user}
          />
          <p className="text-xs text-muted-foreground text-center sm:text-right">
            Pay only while active
          </p>
        </div>
      </div>

      {/* Teaser Messages */}
      {messages.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Recent Agent Messages
            <Badge variant="outline" className="text-xs">Preview</Badge>
          </h2>

          <div className="relative">
            <div className="space-y-3">
              {messages.slice(0, 3).map((msg) => (
                <Card key={msg.id} className="bg-card/50 border-border/60">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {msg.content}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-2">
                      {formatDate(msg.created_at)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Blur gradient CTA */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          </div>

          <div className="text-center pt-2">
            <p className="text-sm text-muted-foreground mb-3">
              Start streaming to see all messages and chat with {typedChannel.name}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
