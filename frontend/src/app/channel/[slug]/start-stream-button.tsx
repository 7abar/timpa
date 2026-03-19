/**
 * StartStreamButton — client component for starting a stream
 */
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useTempoStream } from '@/hooks/use-tempo-stream'
import { startChannelStream } from '@/app/actions/channel'
import { useStreamStore } from '@/store/stream-store'
import { toast } from '@/components/ui/toast'
import { formatEth } from '@/lib/utils'
import type { Channel } from '@/types'
import Link from 'next/link'

interface StartStreamButtonProps {
  channel: Channel
  isLoggedIn: boolean
}

export function StartStreamButton({ channel, isLoggedIn }: StartStreamButtonProps) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const { setStream } = useStreamStore()

  const { startStream } = useTempoStream({
    channelId: channel.id,
    providerAddress: channel.creator?.wallet_address ?? '0x0000000000000000000000000000000000000000',
    rateEthPerMin: channel.rate_eth_per_min,
  })

  if (!isLoggedIn) {
    return (
      <Button asChild size="lg" variant="glow" className="min-w-[160px]">
        <Link href={`/auth/login?redirectTo=/channel/${channel.slug}`}>
          <Zap className="h-4 w-4 mr-2" />
          Sign in to Enter
        </Link>
      </Button>
    )
  }

  const handleStart = async () => {
    setIsStarting(true)
    try {
      // Create DB subscription record
      const result = await startChannelStream(channel.id)
      if (result?.error) {
        toast.error('Failed to start stream', result.error)
        return
      }

      // Start Tempo MPP stream
      await startStream()

      toast.success('Stream started!', `Entering ${channel.name}`)
      router.push(`/channel/${channel.slug}/room`)
    } catch (err: unknown) {
      toast.error('Failed to start stream')
    } finally {
      setIsStarting(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <Button
        size="lg"
        variant="glow"
        onClick={() => setShowConfirm(true)}
        className="min-w-[160px]"
      >
        <Zap className="h-4 w-4 mr-2" />
        Enter Channel
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-timpa-gold" />
              Start Streaming
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <span className="block">
                You&apos;re about to enter <strong className="text-foreground">{channel.name}</strong>.
              </span>
              <span className="block text-timpa-gold font-semibold">
                Rate: {formatEth(channel.rate_eth_per_min)}/minute
              </span>
              <span className="block">
                Cost accrues while streaming. Pause anytime to stop billing.
                Your wallet will process micropayments via Tempo MPP.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStart}
              loading={isStarting}
              variant="glow"
            >
              <Zap className="h-4 w-4 mr-2" />
              Start Stream
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
