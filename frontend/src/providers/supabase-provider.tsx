/**
 * SupabaseProvider — client-side session management
 * Listens to auth state changes and keeps session fresh
 */
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import getSupabaseBrowserClient from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SupabaseContextValue {
  user: User | null
  session: Session | null
  isLoading: boolean
}

const SupabaseContext = createContext<SupabaseContextValue>({
  user: null,
  session: null,
  isLoading: true,
})

export function useSupabase() {
  return useContext(SupabaseContext)
}

interface SupabaseProviderProps {
  children: React.ReactNode
}

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Hydrate current session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen to auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          router.refresh()
        }

        if (event === 'SIGNED_OUT') {
          router.push('/')
          router.refresh()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, router])

  return (
    <SupabaseContext.Provider value={{ user, session, isLoading }}>
      {children}
    </SupabaseContext.Provider>
  )
}
