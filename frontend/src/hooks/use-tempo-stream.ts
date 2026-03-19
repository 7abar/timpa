/**
 * useTempoStream — manages the full stream lifecycle for a single channel
 */
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useTempo } from '@/lib/tempo'
import { useStreamStore } from '@/store/stream-store'
import { StreamStatus } from '@/types'
import type { TempoStream } from '@/types'
import { toast } from '@/components/ui/toast'

interface UseTempoStreamOptions {
  channelId: string
  providerAddress: string
  rateEthPerMin: number
  subscriptionId?: string
}

interface UseTempoStreamReturn {
  stream: TempoStream | null
  startStream: () => Promise<void>
  pauseStream: () => Promise<void>
  resumeStream: () => Promise<void>
  endStream: () => Promise<{ finalCost: number }>
  totalCost: number
  isLoading: boolean
  error: string | null
  isActive: boolean
  isPaused: boolean
}

export function useTempoStream({
  channelId,
  providerAddress,
  rateEthPerMin,
  subscriptionId,
}: UseTempoStreamOptions): UseTempoStreamReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { address: subscriberAddress } = useAccount()
  const tempo = useTempo()

  const {
    activeStreams,
    setStream,
    updateCost,
    pauseStream: storesPause,
    resumeStream: storesResume,
    endStream: storesEnd,
  } = useStreamStore()

  const stream = activeStreams[channelId] ?? null
  const totalCost = stream?.totalCost ?? 0
  const isActive = stream?.status === StreamStatus.Active
  const isPaused = stream?.status === StreamStatus.Paused

  // Subscribe to live cost updates from Tempo
  useEffect(() => {
    if (!stream?.streamId) return

    const unsubscribe = tempo.onCostUpdate(stream.streamId, (cost) => {
      updateCost(channelId, cost)
    })

    return unsubscribe
  }, [stream?.streamId, channelId, tempo, updateCost])

  const startStream = useCallback(async () => {
    if (!subscriberAddress) {
      toast.error('Connect your wallet first')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const tempoStream = await tempo.startStream({
        channelId,
        providerAddress,
        rateEthPerMin,
      })
      setStream(channelId, tempoStream)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start stream'
      setError(msg)
      toast.error('Stream failed to start', msg)
    } finally {
      setIsLoading(false)
    }
  }, [subscriberAddress, channelId, providerAddress, rateEthPerMin, tempo, setStream])

  const pauseStream = useCallback(async () => {
    if (!stream?.streamId) return
    setIsLoading(true)
    try {
      await tempo.pauseStream(stream.streamId)
      storesPause(channelId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to pause stream'
      setError(msg)
      toast.error('Failed to pause stream')
    } finally {
      setIsLoading(false)
    }
  }, [stream?.streamId, channelId, tempo, storesPause])

  const resumeStream = useCallback(async () => {
    if (!stream?.streamId) return
    setIsLoading(true)
    try {
      await tempo.resumeStream(stream.streamId)
      storesResume(channelId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resume stream'
      setError(msg)
      toast.error('Failed to resume stream')
    } finally {
      setIsLoading(false)
    }
  }, [stream?.streamId, channelId, tempo, storesResume])

  const endStream = useCallback(async (): Promise<{ finalCost: number }> => {
    if (!stream?.streamId) return { finalCost: 0 }
    setIsLoading(true)
    try {
      const finalCost = await tempo.endStream(stream.streamId)
      storesEnd(channelId)
      return { finalCost }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to end stream'
      setError(msg)
      toast.error('Failed to end stream')
      return { finalCost: totalCost }
    } finally {
      setIsLoading(false)
    }
  }, [stream?.streamId, channelId, tempo, storesEnd, totalCost])

  return {
    stream,
    startStream,
    pauseStream,
    resumeStream,
    endStream,
    totalCost,
    isLoading,
    error,
    isActive,
    isPaused,
  }
}
