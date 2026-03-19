/**
 * use-agent-poll
 *
 * Polls /api/agent/proactive every 5-10 seconds while the MPP stream is active.
 * Stops immediately on pause/end. Jitters the interval to avoid thundering herd.
 *
 * Behavior contract (mirrors agent-runner):
 *  - Only runs when streamActive === true
 *  - Random interval between MIN_MS and MAX_MS per cycle
 *  - Inserts agent response into chat store as a proactive message
 *  - Clears interval on unmount or stream pause
 */

import { useEffect, useRef, useCallback } from 'react'
import { useChatStore } from '@/store/chat-store'
import type { Message } from '@/types'

const MIN_MS = 5_000   // 5 seconds
const MAX_MS = 10_000  // 10 seconds

function jitter(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

interface UseAgentPollOptions {
  channelId: string
  streamActive: boolean   // poll only when stream is running
  onError?: (err: string) => void
}

export function useAgentPoll({ channelId, streamActive, onError }: UseAgentPollOptions) {
  const { addMessage, setTyping } = useChatStore()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFetchingRef = useRef(false)

  const clearPoll = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const fetchProactive = useCallback(async () => {
    if (isFetchingRef.current) return   // skip if previous call still in-flight
    isFetchingRef.current = true
    setTyping(channelId, true)

    try {
      const res = await fetch('/api/agent/proactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      })

      if (!res.ok) {
        const err = await res.text()
        onError?.(err)
        return
      }

      const data = await res.json() as { response: string; tokens_used: number; model: string }

      if (data.response) {
        const msg: Message = {
          id: crypto.randomUUID(),
          channel_id: channelId,
          sender_id: null,
          is_agent: true,
          content: data.response,
          created_at: new Date().toISOString(),
        }
        addMessage(channelId, msg)
      }
    } catch (err) {
      onError?.(String(err))
    } finally {
      isFetchingRef.current = false
      setTyping(channelId, false)
    }
  }, [channelId, addMessage, setTyping, onError])

  // Schedule next poll with a jittered delay
  const scheduleNext = useCallback(() => {
    clearPoll()
    const delay = jitter(MIN_MS, MAX_MS)
    timeoutRef.current = setTimeout(async () => {
      await fetchProactive()
      scheduleNext()            // re-schedule after each cycle
    }, delay)
  }, [clearPoll, fetchProactive])

  useEffect(() => {
    if (streamActive) {
      scheduleNext()
    } else {
      clearPoll()
      setTyping(channelId, false)
    }

    return () => {
      clearPoll()
      setTyping(channelId, false)
    }
  }, [streamActive, channelId, scheduleNext, clearPoll, setTyping])
}
