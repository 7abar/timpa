/**
 * RoomClient — 3-column layout for the channel room
 */
'use client'

import { useEffect } from 'react'
import { Users, Zap } from 'lucide-react'
import { AgentChat } from '@/components/chat/agent-chat'
import { CostMeter } from '@/components/payment/cost-meter'
import { StreamControls } from '@/components/payment/stream-controls'
import { ConnectWallet } from '@/components/payment/connect-wallet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useStreamStore } from '@/store/stream-store'
import { useTempoStream } from '@/hooks/use-tempo-stream'
import { formatEth, formatNumber } from '@/lib/utils'
import type { Channel, Subscription } from '@/types'
import { StreamStatus } from '@/types'

interface RoomClientProps {
  channel: Channel
  subscription: Subscription
  currentUserId: string
}

export function RoomClient({ channel, subscription, currentUserId }: RoomClientProps) {
  const { activeStreams, setStream } = useStreamStore()

  const {
    stream,
    pauseStream,
    resumeStream,
    endStream,
    totalCost,
    isActive,
  } = useTempoStream({
    channelId: channel.id,
    providerAddress: channel.creator?.wallet_address ?? '0x0',
    rateEthPerMin: channel.rate_eth_per_min,
    subscriptionId: subscription.id,
  })

  // Restore stream state from subscription if not already in store
  useEffect(() => {
    if (!activeStreams[channel.id] && subscription.stream_id) {
      setStream(channel.id, {
        streamId: subscription.stream_id,
        channelId: channel.id,
        ratePerMin: channel.rate_eth_per_min,
        status: subscription.status as unknown as StreamStatus,
        startedAt: new Date(subscription.started_at),
        totalCost: subscription.total_cost_eth,
        tokensUsed: subscription.total_tokens,
      })
    }
  }, [channel.id, subscription, activeStreams, setStream, channel.rate_eth_per_min])

  const currentStream = stream ?? activeStreams[channel.id] ?? null

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
      {/* ===================== LEFT SIDEBAR ===================== */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/30 p-4 gap-4 overflow-y-auto shrink-0">
        {/* Channel Info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-timpa-gold/30">
            <AvatarImage src={channel.creator?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-timpa-gold/20 text-timpa-gold font-bold">
              {channel.name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{channel.name}</p>
            <p className="text-xs text-muted-foreground">
              by @{channel.creator?.username}
            </p>
          </div>
        </div>

        {channel.bio && (
          <p className="text-xs text-muted-foreground leading-relaxed">{channel.bio}</p>
        )}

        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Provider</span>
            <Badge variant="outline" className="text-[10px]">{channel.provider}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rate</span>
            <span className="text-timpa-gold font-semibold flex items-center gap-0.5">
              <Zap className="h-3 w-3" />
              {formatEth(channel.rate_eth_per_min)}/min
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subscribers</span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {formatNumber(channel.total_subscribers)}
            </span>
          </div>
        </div>
      </aside>

      {/* ===================== MAIN CHAT ===================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AgentChat
          channel={channel}
          currentUserId={currentUserId}
        />
      </main>

      {/* ===================== RIGHT PANEL ===================== */}
      <aside className="hidden md:flex flex-col w-72 border-l border-border bg-card/30 p-4 gap-4 overflow-y-auto shrink-0">
        {/* Connect Wallet */}
        <ConnectWallet />

        {/* Cost Meter */}
        <CostMeter
          stream={currentStream}
          tokenCount={currentStream?.tokensUsed ?? subscription.total_tokens}
        />

        {/* Stream Controls */}
        <StreamControls
          stream={currentStream}
          subscriptionId={subscription.id}
          channelSlug={channel.slug}
          onPause={pauseStream}
          onResume={resumeStream}
          onEnd={endStream}
        />
      </aside>
    </div>
  )
}
