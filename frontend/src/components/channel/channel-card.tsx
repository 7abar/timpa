/**
 * ChannelCard — displays a channel in the grid
 */
import Link from 'next/link'
import { Users, TrendingUp, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatEth, formatNumber, truncate } from '@/lib/utils'
import type { Channel } from '@/types'

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  openai:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  groq:      'bg-purple-500/20 text-purple-400 border-purple-500/30',
  gemini:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
  together:  'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

interface ChannelCardProps {
  channel: Channel
  rank?: number
  isTrending?: boolean
}

export function ChannelCard({ channel, rank, isTrending = false }: ChannelCardProps) {
  const providerColor =
    PROVIDER_COLORS[channel.provider] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'

  return (
    <Link href={`/channel/${channel.slug}`} className="block group">
      <Card className="h-full transition-all duration-200 hover:border-timpa-gold/50 hover:shadow-lg hover:shadow-timpa-gold/5 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Avatar with rank badge */}
              <div className="relative">
                <Avatar className="h-12 w-12 border-2 border-border group-hover:border-timpa-gold/50 transition-colors">
                  <AvatarImage src={channel.creator?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-timpa-gold/20 text-timpa-gold font-semibold">
                    {channel.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {rank && rank <= 3 && (
                  <div className={`absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold
                    ${rank === 1 ? 'bg-yellow-400 text-black' :
                      rank === 2 ? 'bg-gray-300 text-black' :
                      'bg-amber-600 text-white'}`}>
                    {rank}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate group-hover:text-timpa-gold transition-colors">
                  {channel.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  by @{channel.creator?.username ?? 'unknown'}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              {isTrending && (
                <Badge variant="outline" className="text-[10px] border-timpa-gold/50 text-timpa-gold gap-0.5 px-1.5">
                  <TrendingUp className="h-2.5 w-2.5" />
                  Hot
                </Badge>
              )}
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${providerColor}`}>
                {channel.provider}
              </span>
            </div>
          </div>

          {/* Bio */}
          {channel.bio && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {truncate(channel.bio, 100)}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{formatNumber(channel.total_subscribers)}</span>
            </div>

            <div className="flex items-center gap-1 text-xs font-semibold text-timpa-gold">
              <Zap className="h-3.5 w-3.5" />
              <span>{formatEth(channel.rate_eth_per_min)}/min</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
