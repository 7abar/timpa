/**
 * ChannelGrid — responsive grid with skeleton loading
 */
'use client'

import { ChannelCard } from './channel-card'
import { Card, CardContent } from '@/components/ui/card'
import type { Channel } from '@/types'

interface ChannelGridProps {
  channels: Channel[]
  isLoading?: boolean
  trendingIds?: string[]
}

function SkeletonCard() {
  return (
    <Card className="h-full bg-card/50">
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-12 w-12 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </div>
        <div className="space-y-1.5 mb-3">
          <div className="h-3 bg-muted rounded animate-pulse w-full" />
          <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
        </div>
        <div className="flex justify-between pt-2 border-t border-border/60">
          <div className="h-3 bg-muted rounded animate-pulse w-16" />
          <div className="h-3 bg-muted rounded animate-pulse w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ChannelGrid({
  channels,
  isLoading = false,
  trendingIds = [],
}: ChannelGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="text-4xl mb-3">🤖</div>
        <p className="text-lg font-medium">No channels found</p>
        <p className="text-sm mt-1">Be the first to create one!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {channels.map((channel, index) => (
        <ChannelCard
          key={channel.id}
          channel={channel}
          rank={index + 1}
          isTrending={trendingIds.includes(channel.id)}
        />
      ))}
    </div>
  )
}
