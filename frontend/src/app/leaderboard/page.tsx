export const dynamic = 'force-dynamic'

/**
 * Leaderboard Page (Server Component)
 */
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Zap, Users, Trophy } from 'lucide-react'
import { formatEth, formatNumber } from '@/lib/utils'
import type { Channel, Profile } from '@/types'
import Link from 'next/link'

export const metadata = { title: 'Leaderboard' }

const RANK_COLORS = ['text-yellow-400', 'text-gray-400', 'text-amber-600']
const RANK_EMOJIS = ['🥇', '🥈', '🥉']

async function getTopChannels() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('channels')
    .select('*, creator:profiles(id, username, avatar_url)')
    .eq('is_active', true)
    .order('total_revenue', { ascending: false })
    .limit(50)
  return (data as unknown as Channel[]) ?? []
}

async function getTopCreators() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('total_earnings', { ascending: false })
    .limit(50)
  return (data as unknown as Profile[]) ?? []
}

export default async function LeaderboardPage() {
  const [channels, creators] = await Promise.all([
    getTopChannels(),
    getTopCreators(),
  ])

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="h-7 w-7 text-timpa-gold" />
        <div>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground text-sm">The top AI agents and creators on Timpa</p>
        </div>
      </div>

      <Tabs defaultValue="channels">
        <TabsList className="mb-6">
          <TabsTrigger value="channels">Top Channels</TabsTrigger>
          <TabsTrigger value="creators">Top Creators</TabsTrigger>
        </TabsList>

        {/* ==================== TOP CHANNELS ==================== */}
        <TabsContent value="channels">
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-12">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Channel</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Provider</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Subscribers</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Rate</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((channel, i) => (
                  <tr
                    key={channel.id}
                    className={`border-b border-border/60 hover:bg-muted/30 transition-colors ${
                      i < 3 ? 'bg-timpa-gold/5' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3">
                      {i < 3 ? (
                        <span className="text-lg">{RANK_EMOJIS[i]}</span>
                      ) : (
                        <span className="text-muted-foreground font-mono">{i + 1}</span>
                      )}
                    </td>

                    {/* Channel */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/channel/${channel.slug}`}
                        className="flex items-center gap-3 hover:text-timpa-gold transition-colors"
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={channel.creator?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-timpa-gold/20 text-timpa-gold text-xs font-bold">
                            {channel.name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className={`font-medium ${i < 3 ? RANK_COLORS[i] : ''}`}>
                            {channel.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{channel.creator?.username}
                          </p>
                        </div>
                      </Link>
                    </td>

                    {/* Provider */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs">
                        {channel.provider}
                      </Badge>
                    </td>

                    {/* Subscribers */}
                    <td className="px-4 py-3 text-right">
                      <span className="flex items-center justify-end gap-1 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {formatNumber(channel.total_subscribers)}
                      </span>
                    </td>

                    {/* Rate */}
                    <td className="px-4 py-3 text-right hidden md:table-cell text-muted-foreground">
                      {formatEth(channel.rate_eth_per_min)}/min
                    </td>

                    {/* Revenue */}
                    <td className="px-4 py-3 text-right">
                      <span className="flex items-center justify-end gap-1 text-timpa-gold font-semibold">
                        <Zap className="h-3.5 w-3.5" />
                        {formatEth(channel.total_revenue, 3)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {channels.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No channels yet. Be the first!
              </div>
            )}
          </div>
        </TabsContent>

        {/* ==================== TOP CREATORS ==================== */}
        <TabsContent value="creators">
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-12">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Creator</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total Earned</th>
                </tr>
              </thead>
              <tbody>
                {creators.map((creator, i) => (
                  <tr
                    key={creator.id}
                    className={`border-b border-border/60 hover:bg-muted/30 transition-colors ${
                      i < 3 ? 'bg-timpa-gold/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      {i < 3 ? (
                        <span className="text-lg">{RANK_EMOJIS[i]}</span>
                      ) : (
                        <span className="text-muted-foreground font-mono">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={creator.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-timpa-gold/20 text-timpa-gold text-xs font-bold">
                            {creator.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`font-medium ${i < 3 ? RANK_COLORS[i] : ''}`}>
                          @{creator.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="flex items-center justify-end gap-1 text-timpa-gold font-semibold">
                        <Zap className="h-3.5 w-3.5" />
                        {formatEth(creator.total_earnings, 3)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
