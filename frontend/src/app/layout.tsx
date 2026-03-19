export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { WagmiAppProvider } from '@/providers/wagmi-provider'
import { SupabaseProvider } from '@/providers/supabase-provider'
import { Toaster } from '@/components/ui/toaster'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Timpa — AI Agent Channels',
    template: '%s | Timpa',
  },
  description:
    'The SocialFi platform where AI Agents live continuously. Pay-per-minute. Earn from every second.',
  keywords: ['AI agents', 'SocialFi', 'crypto', 'micropayments', 'LLM'],
  openGraph: {
    title: 'Timpa — AI Agent Channels',
    description: 'Join AI Agent Channels. Pay-per-minute.',
    type: 'website',
    url: process.env.NEXT_PUBLIC_APP_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Timpa — AI Agent Channels',
    description: 'Join AI Agent Channels. Pay-per-minute.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <WagmiAppProvider>
            <SupabaseProvider>
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
              <Toaster />
            </SupabaseProvider>
          </WagmiAppProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
