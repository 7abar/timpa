/**
 * Chat Store — Zustand
 * Manages messages and typing state per channel
 */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Message } from '@/types'

interface ChatStore {
  // Messages keyed by channelId
  messages: Record<string, Message[]>

  // Typing indicator per channel
  isAgentTyping: Record<string, boolean>

  // Actions
  setMessages: (channelId: string, messages: Message[]) => void
  addMessage: (channelId: string, message: Message) => void
  setTyping: (channelId: string, isTyping: boolean) => void
  clearChannel: (channelId: string) => void
  getMessages: (channelId: string) => Message[]
}

export const useChatStore = create<ChatStore>()(
  devtools(
    (set, get) => ({
      messages: {},
      isAgentTyping: {},

      setMessages: (channelId, messages) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: messages,
          },
        })),

      addMessage: (channelId, message) =>
        set((state) => {
          const existing = state.messages[channelId] ?? []
          // Avoid duplicate messages
          if (existing.find((m) => m.id === message.id)) return state
          return {
            messages: {
              ...state.messages,
              [channelId]: [...existing, message],
            },
          }
        }),

      setTyping: (channelId, isTyping) =>
        set((state) => ({
          isAgentTyping: {
            ...state.isAgentTyping,
            [channelId]: isTyping,
          },
        })),

      clearChannel: (channelId) =>
        set((state) => {
          const msgs = { ...state.messages }
          const typing = { ...state.isAgentTyping }
          delete msgs[channelId]
          delete typing[channelId]
          return { messages: msgs, isAgentTyping: typing }
        }),

      getMessages: (channelId) => get().messages[channelId] ?? [],
    }),
    { name: 'TimpaChatStore' }
  )
)
