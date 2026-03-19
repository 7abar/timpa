/**
 * ConnectWallet — wagmi wallet connection button with account display
 */
'use client'

import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatAddress, formatEth } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import { useState } from 'react'

export function ConnectWallet() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address })
  const [menuOpen, setMenuOpen] = useState(false)

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground text-center mb-1">
          Connect your wallet to start streaming
        </p>
        <Button
          onClick={() => connect({ connector: injected() })}
          disabled={isPending}
          loading={isPending}
          className="w-full gap-2"
        >
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const wc = connectors.find((c) => c.type === 'walletConnect')
            if (wc) connect({ connector: wc })
          }}
          disabled={isPending}
          className="w-full gap-2 text-xs"
        >
          WalletConnect
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const cb = connectors.find((c) => c.type === 'coinbaseWallet')
            if (cb) connect({ connector: cb })
          }}
          disabled={isPending}
          className="w-full gap-2 text-xs"
        >
          Coinbase Wallet
        </Button>
      </div>
    )
  }

  const copyAddress = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    toast.success('Address copied!')
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Avatar className="h-9 w-9 border border-timpa-gold/30">
              <AvatarFallback className="bg-timpa-gold/20 text-timpa-gold text-xs">
                {address?.[2]?.toUpperCase()}{address?.[3]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background" />
          </div>
          <div>
            <p className="text-sm font-mono font-medium">
              {formatAddress(address!)}
            </p>
            <p className="text-xs text-muted-foreground">
              {chain?.name ?? 'Unknown network'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg p-1.5 hover:bg-muted transition-colors"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {balance && (
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
          <p className="text-lg font-bold font-mono text-timpa-gold">
            {(Number(balance.value) / 1e18).toFixed(4)} {balance.symbol}
          </p>
          <p className="text-xs text-muted-foreground">Wallet Balance</p>
        </div>
      )}

      {menuOpen && (
        <div className="flex flex-col gap-1 pt-1 border-t border-border">
          <button
            onClick={copyAddress}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted transition-colors text-left"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Address
          </button>
          <a
            href={`https://basescan.org/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View on BaseScan
          </a>
          <button
            onClick={() => disconnect()}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors text-left"
          >
            <LogOut className="h-3.5 w-3.5" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
