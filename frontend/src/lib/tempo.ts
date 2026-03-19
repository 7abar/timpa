/**
 * Tempo MPP (Micropayment Protocol) Abstraction Layer
 *
 * This module abstracts the Tempo MPP SDK behind a clean interface.
 * The implementation uses viem/wagmi for wallet interactions and
 * maintains stream state locally. Replace the mock internals with
 * the real Tempo SDK when it becomes available.
 */

'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { useStreamStore } from '@/store/stream-store'
import type { TempoConfig, TempoStream } from '@/types'
import { StreamStatus } from '@/types'

// ============================================================
// TYPES
// ============================================================

export type CostUpdateCallback = (totalCostEth: number) => void

interface StreamState {
  config: TempoConfig
  intervalId: ReturnType<typeof setInterval> | null
  callbacks: Set<CostUpdateCallback>
  accruedCost: number
  startedAt: Date
}

// ============================================================
// TEMPO CLIENT CLASS
// ============================================================

/**
 * TempoClient manages pay-per-minute streaming micropayments.
 *
 * Architecture:
 * - When a stream starts, a cost-accrual interval fires every second
 * - Real Tempo integration would hook into on-chain payment channels
 * - This implementation provides the same interface, ready for SDK swap
 */
export class TempoClient {
  private streams = new Map<string, StreamState>()
  private static instance: TempoClient | null = null

  static getInstance(): TempoClient {
    if (!TempoClient.instance) {
      TempoClient.instance = new TempoClient()
    }
    return TempoClient.instance
  }

  /**
   * Start a new pay-per-minute stream
   */
  async startStream(config: TempoConfig): Promise<TempoStream> {
    const streamId = `stream_${config.channelId}_${Date.now()}`
    const startedAt = new Date()

    const state: StreamState = {
      config,
      intervalId: null,
      callbacks: new Set(),
      accruedCost: 0,
      startedAt,
    }

    // Start cost accrual — 1 tick per second
    const ratePerSecond = config.rateEthPerMin / 60
    state.intervalId = setInterval(() => {
      state.accruedCost += ratePerSecond
      state.callbacks.forEach((cb) => cb(state.accruedCost))
    }, 1000)

    this.streams.set(streamId, state)

    const stream: TempoStream = {
      streamId,
      channelId: config.channelId,
      ratePerMin: config.rateEthPerMin,
      status: StreamStatus.Active,
      startedAt,
      totalCost: 0,
    }

    return stream
  }

  /**
   * Pause a stream (stops cost accrual)
   */
  async pauseStream(streamId: string): Promise<void> {
    const state = this.streams.get(streamId)
    if (!state) throw new Error(`Stream ${streamId} not found`)

    if (state.intervalId) {
      clearInterval(state.intervalId)
      state.intervalId = null
    }
  }

  /**
   * Resume a paused stream
   */
  async resumeStream(streamId: string): Promise<void> {
    const state = this.streams.get(streamId)
    if (!state) throw new Error(`Stream ${streamId} not found`)

    if (state.intervalId) return // already running

    const ratePerSecond = state.config.rateEthPerMin / 60
    state.intervalId = setInterval(() => {
      state.accruedCost += ratePerSecond
      state.callbacks.forEach((cb) => cb(state.accruedCost))
    }, 1000)
  }

  /**
   * End a stream permanently
   */
  async endStream(streamId: string): Promise<number> {
    const state = this.streams.get(streamId)
    if (!state) throw new Error(`Stream ${streamId} not found`)

    if (state.intervalId) {
      clearInterval(state.intervalId)
      state.intervalId = null
    }

    const finalCost = state.accruedCost
    this.streams.delete(streamId)
    return finalCost
  }

  /**
   * Register a callback for cost updates
   */
  onCostUpdate(streamId: string, callback: CostUpdateCallback): () => void {
    const state = this.streams.get(streamId)
    if (!state) {
      console.warn(`Stream ${streamId} not found for cost update listener`)
      return () => {}
    }

    state.callbacks.add(callback)

    // Return unsubscribe function
    return () => {
      state.callbacks.delete(callback)
    }
  }

  /**
   * Get current stream snapshot
   */
  getStream(streamId: string): TempoStream | null {
    const state = this.streams.get(streamId)
    if (!state) return null

    return {
      streamId,
      channelId: state.config.channelId,
      ratePerMin: state.config.rateEthPerMin,
      status: state.intervalId ? StreamStatus.Active : StreamStatus.Paused,
      startedAt: state.startedAt,
      totalCost: state.accruedCost,
    }
  }

  /**
   * Get current accrued cost for a stream
   */
  getCurrentCost(streamId: string): number {
    return this.streams.get(streamId)?.accruedCost ?? 0
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const tempoClient = TempoClient.getInstance()

// ============================================================
// REACT HOOK
// ============================================================

/**
 * useTempo — React hook for interacting with the Tempo MPP client.
 * Provides wallet-aware stream management.
 */
export function useTempo() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()

  const startStream = useCallback(
    async (config: Omit<TempoConfig, 'subscriberAddress'>) => {
      if (!address) throw new Error('Wallet not connected')

      return tempoClient.startStream({
        ...config,
        subscriberAddress: address,
      })
    },
    [address]
  )

  const pauseStream = useCallback(
    (streamId: string) => tempoClient.pauseStream(streamId),
    []
  )

  const resumeStream = useCallback(
    (streamId: string) => tempoClient.resumeStream(streamId),
    []
  )

  const endStream = useCallback(
    (streamId: string) => tempoClient.endStream(streamId),
    []
  )

  const onCostUpdate = useCallback(
    (streamId: string, cb: CostUpdateCallback) =>
      tempoClient.onCostUpdate(streamId, cb),
    []
  )

  const getStream = useCallback(
    (streamId: string) => tempoClient.getStream(streamId),
    []
  )

  return {
    startStream,
    pauseStream,
    resumeStream,
    endStream,
    onCostUpdate,
    getStream,
    isWalletConnected: !!address,
    walletAddress: address,
  }
}
