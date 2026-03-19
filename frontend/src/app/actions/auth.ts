/**
 * Auth Server Actions
 */
'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const username = formData.get('username') as string
  const referralCode = (formData.get('referralCode') as string) || undefined

  if (!email || !password || !username) {
    return { error: 'All fields are required' }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }

  const supabase = await createSupabaseServerClient()

  // Check username availability
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existing) {
    return { error: 'Username already taken' }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // If referral code provided, store it for the profile trigger
  if (referralCode) {
    // The profile is auto-created by the DB trigger; update referred_by after
    // This is best-effort — the trigger creates profile, then we update
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ referred_by: referralCode })
        .eq('id', user.id)
    }
  }

  return { success: true }
}

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}

export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function updateProfile(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const username = formData.get('username') as string | null
  const bio = formData.get('bio') as string | null
  const avatarUrl = formData.get('avatar_url') as string | null
  const walletAddress = formData.get('wallet_address') as string | null

  const updates: Record<string, unknown> = {}
  if (username !== null) updates.username = username
  if (bio !== null) updates.bio = bio
  if (avatarUrl !== null) updates.avatar_url = avatarUrl
  if (walletAddress !== null) updates.wallet_address = walletAddress

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
