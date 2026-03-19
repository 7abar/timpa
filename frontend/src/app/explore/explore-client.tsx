/**
 * ExploreClient — search, sort, filter UI (client component)
 */
'use client'

import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChannelGrid } from '@/components/channel/channel-grid'
import { Badge } from '@/components/ui/badge'
import type { Channel } from '@/types'
import { LLMProvider } from '@/types'

type SortOption = 'trending' | 'newest' | 'cheapest' | 'subscribers'

interface ExploreClientProps {
  channels: Channel[]
  trendingIds: string[]
}

export function ExploreClient({ channels, trendingIds }: ExploreClientProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('trending')
  const [providerFilter, setProviderFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    let result = [...channels]

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.bio?.toLowerCase().includes(q) ||
          c.creator?.username?.toLowerCase().includes(q)
      )
    }

    // Provider filter
    if (providerFilter !== 'all') {
      result = result.filter((c) => c.provider === providerFilter)
    }

    // Sort
    switch (sort) {
      case 'trending':
        result.sort((a, b) => b.total_subscribers - a.total_subscribers)
        break
      case 'newest':
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        break
      case 'cheapest':
        result.sort((a, b) => a.rate_eth_per_min - b.rate_eth_per_min)
        break
      case 'subscribers':
        result.sort((a, b) => b.total_subscribers - a.total_subscribers)
        break
    }

    return result
  }, [channels, search, sort, providerFilter])

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search channels, creators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Sort */}
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trending">🔥 Trending</SelectItem>
            <SelectItem value="newest">🆕 Newest</SelectItem>
            <SelectItem value="cheapest">💸 Cheapest</SelectItem>
            <SelectItem value="subscribers">👥 Most Subscribers</SelectItem>
          </SelectContent>
        </Select>

        {/* Provider Filter */}
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All Providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {Object.values(LLMProvider).map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters */}
      {(search || providerFilter !== 'all') && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters:
          </span>
          {search && (
            <Badge variant="outline" className="gap-1">
              "{search}"
              <button onClick={() => setSearch('')} className="hover:text-destructive">×</button>
            </Badge>
          )}
          {providerFilter !== 'all' && (
            <Badge variant="outline" className="gap-1">
              {providerFilter}
              <button onClick={() => setProviderFilter('all')} className="hover:text-destructive">×</button>
            </Badge>
          )}
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} channel{filtered.length !== 1 ? 's' : ''} found
      </p>

      <ChannelGrid channels={filtered} trendingIds={trendingIds} />
    </div>
  )
}
