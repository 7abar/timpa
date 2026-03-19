/**
 * useAgentPoll — polls /api/agent every 8s when stream is active
 * to trigger agent auto-posts (proactive messages)
 */
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useChatStore } from '@/store/chat-store'
import { useStreamStore } from '@/store/stream-store'
import { StreamStatus } from '@/types'

interface UseAgentPollOptions {
  channelId: string
  enabled?: boolean
  intervalMs?: number
}

export function useAgentPoll({
  channelId,
  enabled = true,
  intervalMs = 8000,
}: UseAgentPollOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isFetchingRef = useRef(false)

  const { setTyping } = useChatStore()
  const { activeStreams } = useStreamStore()

  const stream = activeStreams[channelId]
  const isActive = stream?.status === StreamStatus.Active

  const pollAgent = useCallback(async () => {
    if (!enabled || !isActive) return
    if (isFetchingRef.current) return // skip if previous request pending

    isFetchingRef.current = true
    setTyping(channelId, true)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      })

      if (!response.ok) {
        console.warn(`Agent poll failed: ${response.status}`)
      }
      // The message will arrive via Supabase Realtime — no need to parse here
    } catch (err) {
      console.warn('Agent poll error:', err)
    } finally {
      isFetchingRef.current = false
      setTyping(channelId, false)
    }
  }, [channelId, enabled, isActive, setTyping])

  useEffect(() => {
    if (!enabled || !isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Start polling
    intervalRef.current = setInterval(pollAgent, intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, isActive, intervalMs, pollAgent])

  return { isPolling: !!intervalRef.current }
}
