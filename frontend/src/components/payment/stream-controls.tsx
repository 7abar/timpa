/**
 * StreamControls — Pause / Resume / End stream buttons
 */
'use client'

import { useState } from 'react'
import { Play, Pause, StopCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatEth } from '@/lib/utils'
import { StreamStatus } from '@/types'
import type { TempoStream } from '@/types'
import { useRouter } from 'next/navigation'
import {
  pauseChannelStream,
  resumeChannelStream,
  endChannelStream,
} from '@/app/actions/channel'
import { toast } from '@/components/ui/toast'

interface StreamControlsProps {
  stream: TempoStream | null
  subscriptionId: string
  channelSlug: string
  onPause?: () => Promise<void>
  onResume?: () => Promise<void>
  onEnd?: () => Promise<{ finalCost: number }>
}

export function StreamControls({
  stream,
  subscriptionId,
  channelSlug,
  onPause,
  onResume,
  onEnd,
}: StreamControlsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)

  const isActive = stream?.status === StreamStatus.Active
  const isPaused = stream?.status === StreamStatus.Paused

  const handlePause = async () => {
    setIsLoading(true)
    try {
      await onPause?.()
      await pauseChannelStream(subscriptionId)
      toast.success('Stream paused')
    } catch (err) {
      toast.error('Failed to pause stream')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResume = async () => {
    setIsLoading(true)
    try {
      await onResume?.()
      await resumeChannelStream(subscriptionId)
      toast.success('Stream resumed')
    } catch (err) {
      toast.error('Failed to resume stream')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnd = async () => {
    setIsLoading(true)
    setShowEndConfirm(false)
    try {
      const { finalCost } = await onEnd?.() ?? { finalCost: stream?.totalCost ?? 0 }
      await endChannelStream(subscriptionId, finalCost, stream?.tokensUsed ?? 0)
      toast.success('Stream ended', `Total spent: ${formatEth(finalCost)}`)
      router.push(`/channel/${channelSlug}`)
    } catch (err) {
      toast.error('Failed to end stream')
    } finally {
      setIsLoading(false)
    }
  }

  if (!stream) return null

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Stream Controls</h3>

        <div className="flex flex-col gap-2">
          {isActive && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handlePause}
              disabled={isLoading}
              loading={isLoading}
            >
              <Pause className="h-4 w-4" />
              Pause Stream
            </Button>
          )}

          {isPaused && (
            <Button
              className="w-full gap-2"
              onClick={handleResume}
              disabled={isLoading}
              loading={isLoading}
            >
              <Play className="h-4 w-4" />
              Resume Stream
            </Button>
          )}

          <Button
            variant="destructive"
            className="w-full gap-2 opacity-80 hover:opacity-100"
            onClick={() => setShowEndConfirm(true)}
            disabled={isLoading}
          >
            <StopCircle className="h-4 w-4" />
            End Session
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Ending the session finalizes your payment
        </p>
      </div>

      {/* End Confirmation Dialog */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              End Stream?
            </DialogTitle>
            <DialogDescription>
              This will end your current stream session.
              {stream?.totalCost != null && (
                <span className="block mt-2 font-medium text-foreground">
                  Total accrued: <span className="text-timpa-gold">{formatEth(stream.totalCost)}</span>
                </span>
              )}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEndConfirm(false)}
            >
              Keep Streaming
            </Button>
            <Button
              variant="destructive"
              onClick={handleEnd}
              loading={isLoading}
            >
              End & Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
