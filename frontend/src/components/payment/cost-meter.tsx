/**
 * CostMeter — real-time display of stream cost, duration, tokens
 */
'use client'

import { useEffect, useState } from 'react'
import { Zap, Clock, Hash, DollarSign } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { formatEth, formatEthUsd, formatDuration } from '@/lib/utils'
import { StreamStatus } from '@/types'
import type { TempoStream } from '@/types'
import { cn } from '@/lib/utils'

interface CostMeterProps {
  stream: TempoStream | null
  sessionBudget?: number   // max ETH to spend (optional warning)
  tokenCount?: number
}

export function CostMeter({ stream, sessionBudget = 0.05, tokenCount = 0 }: CostMeterProps) {
  const [elapsed, setElapsed] = useState(0)

  const isActive = stream?.status === StreamStatus.Active
  const totalCost = stream?.totalCost ?? 0
  const budgetPercent = Math.min((totalCost / sessionBudget) * 100, 100)

  // Elapsed timer
  useEffect(() => {
    if (!stream?.startedAt) { setElapsed(0); return }

    const tick = () => {
      setElapsed(Math.floor((Date.now() - new Date(stream.startedAt).getTime()) / 1000))
    }

    tick()
    if (isActive) {
      const id = setInterval(tick, 1000)
      return () => clearInterval(id)
    }
  }, [stream?.startedAt, isActive])

  if (!stream) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        No active stream
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Cost Meter</h3>
        <div className={cn(
          'flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1',
          isActive
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-amber-500/20 text-amber-400'
        )}>
          <div className={cn(
            'h-1.5 w-1.5 rounded-full',
            isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
          )} />
          {isActive ? 'Live' : 'Paused'}
        </div>
      </div>

      {/* Main Cost */}
      <div className="text-center py-2">
        <div className="text-3xl font-bold text-timpa-gold font-mono">
          {formatEth(totalCost, 6)}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          ≈ {formatEthUsd(totalCost)}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center rounded-lg bg-muted/50 p-2">
          <Clock className="h-4 w-4 text-muted-foreground mb-1" />
          <span className="text-xs font-mono font-semibold">
            {formatDuration(elapsed)}
          </span>
          <span className="text-[10px] text-muted-foreground">duration</span>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-muted/50 p-2">
          <Zap className="h-4 w-4 text-timpa-gold mb-1" />
          <span className="text-xs font-mono font-semibold">
            {stream.ratePerMin.toFixed(4)}
          </span>
          <span className="text-[10px] text-muted-foreground">ETH/min</span>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-muted/50 p-2">
          <Hash className="h-4 w-4 text-muted-foreground mb-1" />
          <span className="text-xs font-mono font-semibold">
            {tokenCount.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted-foreground">tokens</span>
        </div>
      </div>

      {/* Budget Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Session budget</span>
          <span className={cn(
            'font-medium',
            budgetPercent > 80 ? 'text-destructive' :
            budgetPercent > 60 ? 'text-amber-400' :
            'text-muted-foreground'
          )}>
            {budgetPercent.toFixed(0)}%
          </span>
        </div>
        <Progress value={budgetPercent} className={cn(
          budgetPercent > 80 ? '[&>div]:bg-destructive' :
          budgetPercent > 60 ? '[&>div]:bg-amber-400' : ''
        )} />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{formatEth(totalCost, 5)}</span>
          <span>{formatEth(sessionBudget)} limit</span>
        </div>
      </div>

      {/* Rate info */}
      <p className="text-[10px] text-muted-foreground text-center">
        Cost accrues at {formatEth(stream.ratePerMin)}/min while active
      </p>
    </div>
  )
}
