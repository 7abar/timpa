/**
 * Stream Store — Zustand
 * Manages active Tempo MPP streams per channel
 */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { TempoStream } from '@/types'
import { StreamStatus } from '@/types'

interface StreamStore {
  // Map from channelId → TempoStream
  activeStreams: Record<string, TempoStream>

  // Actions
  setStream: (channelId: string, stream: TempoStream) => void
  updateCost: (channelId: string, totalCost: number) => void
  updateTokens: (channelId: string, tokens: number) => void
  pauseStream: (channelId: string) => void
  resumeStream: (channelId: string) => void
  endStream: (channelId: string) => void
  getStream: (channelId: string) => TempoStream | null
  clearAll: () => void
}

export const useStreamStore = create<StreamStore>()(
  devtools(
    (set, get) => ({
      activeStreams: {},

      setStream: (channelId, stream) =>
        set((state) => ({
          activeStreams: {
            ...state.activeStreams,
            [channelId]: stream,
          },
        })),

      updateCost: (channelId, totalCost) =>
        set((state) => {
          const stream = state.activeStreams[channelId]
          if (!stream) return state
          return {
            activeStreams: {
              ...state.activeStreams,
              [channelId]: { ...stream, totalCost },
            },
          }
        }),

      updateTokens: (channelId, tokens) =>
        set((state) => {
          const stream = state.activeStreams[channelId]
          if (!stream) return state
          return {
            activeStreams: {
              ...state.activeStreams,
              [channelId]: { ...stream, tokensUsed: tokens },
            },
          }
        }),

      pauseStream: (channelId) =>
        set((state) => {
          const stream = state.activeStreams[channelId]
          if (!stream) return state
          return {
            activeStreams: {
              ...state.activeStreams,
              [channelId]: { ...stream, status: StreamStatus.Paused },
            },
          }
        }),

      resumeStream: (channelId) =>
        set((state) => {
          const stream = state.activeStreams[channelId]
          if (!stream) return state
          return {
            activeStreams: {
              ...state.activeStreams,
              [channelId]: { ...stream, status: StreamStatus.Active },
            },
          }
        }),

      endStream: (channelId) =>
        set((state) => {
          const streams = { ...state.activeStreams }
          if (streams[channelId]) {
            streams[channelId] = { ...streams[channelId], status: StreamStatus.Ended }
          }
          return { activeStreams: streams }
        }),

      getStream: (channelId) => get().activeStreams[channelId] ?? null,

      clearAll: () => set({ activeStreams: {} }),
    }),
    { name: 'TimpaStreamStore' }
  )
)
