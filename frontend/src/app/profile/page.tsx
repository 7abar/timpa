export const dynamic = 'force-dynamic'

/**
 * Profile Page (Protected)
 */
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChannelGrid } from '@/components/channel/channel-grid'
import { formatEth, formatAddress, formatDate, formatNumber } from '@/lib/utils'
import type { Channel, Profile, Referral } from '@/types'

export const metadata = { title: 'My Profile' }

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?redirectTo=/profile')

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  const typedProfile = profile as unknown as Profile

  // Fetch user's channels
  const { data: channels } = await supabase
    .from('channels')
    .select('*, creator:profiles(id, username, avatar_url)')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })

  const myChannels = (channels as unknown as Channel[]) ?? []

  // Fetch referrals
  const { data: referrals } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', user.id)

  const myReferrals = (referrals as unknown as Referral[]) ?? []

  // Subscription stats
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('total_cost_eth, total_tokens, status')
    .eq('subscriber_id', user.id)

  const totalSpent = (subs ?? []).reduce((s, x) => s + (x.total_cost_eth ?? 0), 0)
  const totalTokens = (subs ?? []).reduce((s, x) => s + (x.total_tokens ?? 0), 0)

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8 items-start">
        <Avatar className="h-20 w-20 border-2 border-timpa-gold/30">
          <AvatarImage src={typedProfile.avatar_url ?? undefined} />
          <AvatarFallback className="bg-timpa-gold/20 text-timpa-gold text-2xl font-bold">
            {typedProfile.username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h1 className="text-2xl font-bold">@{typedProfile.username}</h1>
          {typedProfile.bio && (
            <p className="text-muted-foreground mt-1">{typedProfile.bio}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-3">
            {typedProfile.wallet_address && (
              <Badge variant="outline" className="font-mono text-xs gap-1">
                {formatAddress(typedProfile.wallet_address)}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              Joined {formatDate(typedProfile.created_at)}
            </Badge>
            {typedProfile.referral_code && (
              <Badge variant="secondary" className="text-xs">
                Referral: {typedProfile.referral_code}
              </Badge>
            )}
          </div>

          {/* Earnings */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <div className="text-lg font-bold text-timpa-gold font-mono">
                {formatEth(typedProfile.total_earnings)}
              </div>
              <div className="text-xs text-muted-foreground">Earned</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <div className="text-lg font-bold font-mono">
                {formatEth(totalSpent)}
              </div>
              <div className="text-xs text-muted-foreground">Spent</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <div className="text-lg font-bold font-mono">
                {formatNumber(totalTokens)}
              </div>
              <div className="text-xs text-muted-foreground">Tokens</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="channels">
        <TabsList>
          <TabsTrigger value="channels">
            My Channels ({myChannels.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="referrals">
            Referrals ({myReferrals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="mt-6">
          {myChannels.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-4xl mb-3">🤖</div>
              <p className="font-medium">No channels yet</p>
              <p className="text-sm">Create your first AI agent channel</p>
            </div>
          ) : (
            <ChannelGrid channels={myChannels} />
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Earned</span>
                    <span className="font-semibold text-timpa-gold">
                      {formatEth(typedProfile.total_earnings)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Channels</span>
                    <span>{myChannels.filter((c) => c.is_active).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Subscribers</span>
                    <span>
                      {myChannels.reduce((s, c) => s + c.total_subscribers, 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Spending Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Spent</span>
                    <span className="font-semibold">{formatEth(totalSpent)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Sessions</span>
                    <span>{subs?.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tokens Used</span>
                    <span>{formatNumber(totalTokens)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="mt-6">
          {myReferrals.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-4xl mb-3">🎁</div>
              <p className="font-medium">No referrals yet</p>
              <p className="text-sm">Share your code: <code className="bg-muted px-2 py-1 rounded">{typedProfile.referral_code}</code></p>
            </div>
          ) : (
            <div className="space-y-3">
              {myReferrals.map((ref) => (
                <Card key={ref.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Referral #{ref.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {ref.paid_at ? `Paid ${formatDate(ref.paid_at)}` : 'Pending'}
                      </p>
                    </div>
                    <span className="text-timpa-gold font-semibold">
                      {formatEth(ref.reward_eth)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
