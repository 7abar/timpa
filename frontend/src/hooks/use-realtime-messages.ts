/**
 * useRealtimeMessages — subscribes to Supabase Realtime for channel messages
 */
'use client'

import { useEffect, useCallback } from 'react'
import getSupabaseBrowserClient from '@/lib/supabase/client'
import { useChatStore } from '@/store/chat-store'
import type { Message } from '@/types'

interface UseRealtimeMessagesOptions {
  channelId: string
  enabled?: boolean
}

export function useRealtimeMessages({
  channelId,
  enabled = true,
}: UseRealtimeMessagesOptions) {
  const supabase = getSupabaseBrowserClient()
  const { addMessage, setMessages, getMessages } = useChatStore()

  // Load initial messages
  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles(id, username, avatar_url)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      console.error('Failed to load messages:', error.message)
      return
    }

    setMessages(channelId, (data as unknown as Message[]) ?? [])
  }, [channelId, supabase, setMessages])

  // Subscribe to realtime inserts
  useEffect(() => {
    if (!enabled) return

    loadMessages()

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload: { new: Record<string, unknown> }) => {
          const newMsg = payload.new as unknown as Message

          // If it has a sender_id, fetch the profile
          if (newMsg.sender_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .eq('id', newMsg.sender_id)
              .single()

            addMessage(channelId, {
              ...newMsg,
              sender: profile ?? undefined,
            } as Message)
          } else {
            addMessage(channelId, newMsg)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelId, enabled, supabase, addMessage, loadMessages])

  return {
    messages: getMessages(channelId),
    refetch: loadMessages,
  }
}
