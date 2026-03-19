'use client'

import { Toaster as SonnerToaster } from 'sonner'

/**
 * Toaster — renders the Sonner notification stack
 * Place this once in the root layout
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          border: '1px solid hsl(var(--border))',
        },
        className: 'sonner-toast',
      }}
      richColors
      closeButton
    />
  )
}
