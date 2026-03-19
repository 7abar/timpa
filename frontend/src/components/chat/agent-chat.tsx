/**
 * AgentChat — main chat interface
 * - Realtime messages via Supabase
 * - Agent auto-polling every 8s when stream active
 * - Auto-scroll to bottom
 * - Typing indicator
 */
'use client'

import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble, TypingIndicator } from './message-bubble'
import { ChatInput } from './chat-input'
import { useRealtimeMessages } from '@/hooks/use-realtime-messages'
import { useAgentPoll } from '@/hooks/use-agent-poll'
import { useChatStore } from '@/store/chat-store'
import { useStreamStore } from '@/store/stream-store'
import { StreamStatus } from '@/types'
import { sendMessage } from '@/app/actions/message'
import type { Channel } from '@/types'

interface AgentChatProps {
  channel: Channel
  currentUserId?: string
}

export function AgentChat({ channel, currentUserId }: AgentChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const { messages, isAgentTyping } = useChatStore()
  const { activeStreams } = useStreamStore()

  const stream = activeStreams[channel.id]
  const isActive = stream?.status === StreamStatus.Active

  // Subscribe to Supabase Realtime messages
  const { messages: realtimeMessages } = useRealtimeMessages({
    channelId: channel.id,
    enabled: true,
  })

  // Poll agent for auto-posts when stream is active (5-10s jittered interval)
  useAgentPoll({
    channelId: channel.id,
    streamActive: true,
  })

  const channelMessages = messages[channel.id] ?? realtimeMessages
  const isTyping = isAgentTyping[channel.id] ?? false

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [channelMessages, isTyping])

  const handleSendMessage = async (content: string) => {
    if (!currentUserId) return
    await sendMessage(channel.id, content)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4 min-h-full">
          {channelMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="text-5xl mb-4">🤖</div>
              <p className="font-medium">
                {channel.name} is ready
              </p>
              <p className="text-sm mt-1">
                {isActive
                  ? 'Start chatting or wait for the agent to speak'
                  : 'Start your stream to begin the conversation'}
              </p>
            </div>
          )}

          {channelMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              currentUserId={currentUserId}
              agentName={channel.name}
              agentAvatar={channel.creator?.avatar_url ?? undefined}
            />
          ))}

          {isTyping && (
            <TypingIndicator agentName={channel.name} />
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <ChatInput
        onSend={handleSendMessage}
        isStreamActive={isActive}
        isLoading={isTyping}
      />
    </div>
  )
}
