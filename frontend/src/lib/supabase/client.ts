/**
 * Browser-side Supabase client (singleton, lazy-init)
 */
import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | undefined

export function getSupabaseBrowserClient() {
  // Guard against missing env vars (build time / SSR without vars)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return a dummy-safe object during build; real calls need the vars set
    if (typeof window === 'undefined') {
      // SSR pre-render without env: return null-safe stub
      return null as unknown as ReturnType<typeof createBrowserClient>
    }
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  if (client) return client
  client = createBrowserClient(url, key)
  return client
}

export default getSupabaseBrowserClient
