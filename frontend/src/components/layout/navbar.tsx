/**
 * Timpa Navbar
 * Logo | Explore | Leaderboard | Create | WalletConnect | User Menu
 */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import {
  Compass,
  Trophy,
  Plus,
  LogOut,
  User,
  LayoutDashboard,
  Wallet,
  ChevronDown,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn, formatAddress } from '@/lib/utils'
import { useSupabase } from '@/providers/supabase-provider'
import { signOut } from '@/app/actions/auth'

const navLinks = [
  { href: '/explore',      label: 'Explore',      icon: Compass },
  { href: '/leaderboard',  label: 'Leaderboard',  icon: Trophy },
]

export function Navbar() {
  const pathname = usePathname()
  const { user } = useSupabase()
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleConnectWallet = () => {
    connect({ connector: injected() })
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-timpa-gold">
            <Zap className="h-5 w-5 text-black" />
          </div>
          <span className="bg-gradient-to-r from-timpa-gold to-amber-300 bg-clip-text text-transparent">
            Timpa
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Create Button */}
          {user && (
            <Button asChild size="sm" variant="outline" className="hidden sm:flex gap-1">
              <Link href="/create">
                <Plus className="h-4 w-4" />
                Create
              </Link>
            </Button>
          )}

          {/* Wallet */}
          {!isConnected ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleConnectWallet}
              className="gap-1.5"
            >
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Connect Wallet</span>
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground bg-muted/50">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {formatAddress(address!)}
            </div>
          )}

          {/* User Menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 rounded-lg p-1.5 hover:bg-accent transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-xs bg-timpa-gold/20 text-timpa-gold">
                    {user.user_metadata?.username?.[0]?.toUpperCase() ??
                      user.email?.[0]?.toUpperCase() ??
                      'U'}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>

              {menuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-48 z-20 rounded-xl border border-border bg-popover shadow-xl p-1">
                    <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border mb-1">
                      {user.email}
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      href="/profile?tab=channels"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      My Channels
                    </Link>
                    <div className="border-t border-border mt-1 pt-1">
                      <form action={signOut}>
                        <button
                          type="submit"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => setMenuOpen(false)}
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </form>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Button asChild size="sm">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}
