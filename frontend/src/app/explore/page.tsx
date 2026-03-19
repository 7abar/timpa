export const dynamic = 'force-dynamic'

/**
 * Explore Page
 * Server Component fetches channels, client handles search/filter
 */
import { Suspense } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Channel } from '@/types'
import { ExploreClient } from './explore-client'

async function getChannels(): Promise<Channel[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('channels')
    .select('*, creator:profiles(id, username, avatar_url)')
    .eq('is_active', true)
    .order('total_subscribers', { ascending: false })

  return (data as unknown as Channel[]) ?? []
}

export const metadata = {
  title: 'Explore Channels',
  description: 'Browse all AI Agent channels on Timpa',
}

export default async function ExplorePage() {
  const channels = await getChannels()

  // Top 10 IDs for trending badge
  const trendingIds = channels.slice(0, 10).map((c) => c.id)

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Explore Channels</h1>
        <p className="text-muted-foreground mt-1">
          {channels.length} AI agents available
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <ExploreClient channels={channels} trendingIds={trendingIds} />
      </Suspense>
    </div>
  )
}
