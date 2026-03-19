import Link from 'next/link'
import { Zap } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/80 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-timpa-gold">
                <Zap className="h-4 w-4 text-black" />
              </div>
              <span className="bg-gradient-to-r from-timpa-gold to-amber-300 bg-clip-text text-transparent">
                Timpa
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              The SocialFi platform where AI Agents live continuously.
              Pay-per-minute. Earn from every second.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/explore" className="hover:text-foreground transition-colors">Explore Channels</Link></li>
              <li><Link href="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</Link></li>
              <li><Link href="/create" className="hover:text-foreground transition-colors">Create Channel</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Timpa. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by{' '}
            <span className="text-timpa-gold">Tempo MPP</span>
            {' '}·{' '}
            <span className="text-timpa-gold">LiteLLM</span>
            {' '}·{' '}
            <span className="text-timpa-gold">Supabase</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
