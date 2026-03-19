/**
 * WagmiProvider — sets up wagmi + tanstack-query for wallet interactions
 */
'use client'

import React, { useState } from 'react'
import { WagmiProvider as WagmiProviderRoot, createConfig, http } from 'wagmi'
import { mainnet, base, baseSepolia } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

function makeWagmiConfig() {
  const projectId = process.env.NEXT_PUBLIC_WAGMI_PROJECT_ID!

  return createConfig({
    chains: [base, baseSepolia, mainnet],
    connectors: [
      injected(),
      walletConnect({ projectId }),
      coinbaseWallet({ appName: 'Timpa', appLogoUrl: '/logo.png' }),
    ],
    transports: {
      [base.id]: http(),
      [baseSepolia.id]: http(),
      [mainnet.id]: http(),
    },
    ssr: true,
  })
}

interface WagmiAppProviderProps {
  children: React.ReactNode
}

export function WagmiAppProvider({ children }: WagmiAppProviderProps) {
  // Create config and QueryClient once per component lifecycle
  const [config] = useState(makeWagmiConfig)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,          // 1 minute
        retry: 1,
      },
    },
  }))

  return (
    <WagmiProviderRoot config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProviderRoot>
  )
}
