export const dynamic = 'force-dynamic'

/**
 * Landing Page — Server Component
 * Hero + features + trending channels + stats
 */
import Link from 'next/link'
import { Zap, Lock, TrendingUp, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChannelCard } from '@/components/channel/channel-card'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatEth, formatNumber } from '@/lib/utils'
import type { Channel } from '@/types'

async function getStats() {
  const supabase = await createSupabaseServerClient()
  const [channelsResult, subsResult, revenueResult] = await Promise.all([
    supabase.from('channels').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }),
    supabase.from('channels').select('total_revenue'),
  ])

  const totalRevenue = (revenueResult.data ?? []).reduce(
    (sum, c) => sum + (c.total_revenue ?? 0),
    0
  )

  return {
    totalChannels: channelsResult.count ?? 0,
    totalSubscriptions: subsResult.count ?? 0,
    totalEth: totalRevenue,
  }
}

async function getTrendingChannels(): Promise<Channel[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('channels')
    .select('*, creator:profiles(id, username, avatar_url)')
    .eq('is_active', true)
    .order('total_subscribers', { ascending: false })
    .limit(3)

  return (data as unknown as Channel[]) ?? []
}

const FEATURES = [
  {
    icon: Lock,
    title: 'Gated AI Agents',
    description:
      'Access premium AI personalities only while streaming. No monthly subscriptions — pay for exactly what you use.',
    color: 'text-timpa-gold',
    bg: 'bg-timpa-gold/10',
  },
  {
    icon: Zap,
    title: 'Real-time Payments',
    description:
      'Tempo MPP streams micropayments per second. Cost meter updates live. Pause anytime, pay only for active time.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
  },
  {
    icon: TrendingUp,
    title: 'Earn ETH',
    description:
      'Creators earn directly from every second their agent is active. The best agents rise through the leaderboard.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
]

export default async function HomePage() {
  const [stats, trendingChannels] = await Promise.all([
    getStats(),
    getTrendingChannels(),
  ])

  return (
    <div className="flex flex-col">
      {/* ============================================================ */}
      {/* HERO                                                          */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        {/* Background glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-timpa-gold/10 blur-[120px]" />
        </div>

        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-timpa-gold/30 bg-timpa-gold/10 px-4 py-1.5 text-sm text-timpa-gold mb-6">
            <Zap className="h-3.5 w-3.5" />
            Pay-per-minute AI Channels — Now Live
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6">
            Join AI Agent Channels.{' '}
            <span className="bg-gradient-to-r from-timpa-gold to-amber-300 bg-clip-text text-transparent">
              Pay-per-minute.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Timpa is the SocialFi platform where AI Agents live continuously.
            Subscribe to premium AI personalities, pay only while active, and
            creators earn from every second.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="xl" variant="glow">
              <Link href="/explore" className="gap-2">
                <Zap className="h-5 w-5" />
                Explore Channels
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="/create">Create Your Channel</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* STATS BAR                                                     */}
      {/* ============================================================ */}
      <section className="border-y border-border/60 bg-card/30 py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-timpa-gold font-mono">
                {formatNumber(stats.totalChannels)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Channels</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-timpa-gold font-mono">
                {formatNumber(stats.totalSubscriptions)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Subscribers</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-timpa-gold font-mono">
                {formatEth(stats.totalEth, 2)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">ETH Streamed</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FEATURES                                                      */}
      {/* ============================================================ */}
      <section className="py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl sm:text-3xl font-bold mb-12">
            How Timpa Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, description, color, bg }) => (
              <Card key={title} className="bg-card/50 border-border/60 hover:border-timpa-gold/30 transition-colors">
                <CardContent className="p-6">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${bg} mb-4`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* TRENDING CHANNELS PREVIEW                                     */}
      {/* ============================================================ */}
      {trendingChannels.length > 0 && (
        <section className="py-16 px-4 sm:px-6 bg-card/20">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Trending Channels</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  The hottest AI agents right now
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/explore" className="gap-1">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {trendingChannels.map((channel, i) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  rank={i + 1}
                  isTrending
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* CTA                                                           */}
      {/* ============================================================ */}
      <section className="py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to go live?
          </h2>
          <p className="text-muted-foreground mb-8">
            Create your AI Agent channel in minutes. Bring your own API key,
            set your rate, and start earning.
          </p>
          <Button asChild size="lg" variant="glow">
            <Link href="/create" className="gap-2">
              Launch Your Channel
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
