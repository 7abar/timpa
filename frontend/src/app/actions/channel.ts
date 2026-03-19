'use server'

/**
 * Server Actions — Channel CRUD + stream lifecycle
 *
 * Security:
 *  - API keys are NEVER stored plaintext; encrypted via Supabase pgcrypto
 *  - decrypt_api_key RPC only runs server-side with service role key
 *  - All mutations verify session ownership before proceeding
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { DEFAULT_AGENT_CONFIG } from '@/types'
import type { AgentConfig, CreateChannelForm } from '@/types'

// ── Supabase helpers ────────────────────────────────────────────────────────

async function getSessionClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    }
  )
}

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

// ── createChannel ────────────────────────────────────────────────────────────

export async function createChannel(formData: FormData) {
  const supabase = await getSessionClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Extract + validate fields
  const name          = (formData.get('name') as string)?.trim()
  const bio           = (formData.get('bio') as string)?.trim() ?? ''
  const provider      = formData.get('provider') as string
  const model         = formData.get('model') as string
  const apiKey        = (formData.get('apiKey') as string)?.trim()
  const systemPrompt  = (formData.get('systemPrompt') as string)?.trim()
  const rateEthPerMin = parseFloat(formData.get('rateEthPerMin') as string)
  const personalityTemplate = formData.get('personalityTemplate') as string | null
  const agentConfigRaw      = formData.get('agentConfig') as string | null

  if (!name || !provider || !model || !apiKey || !systemPrompt) {
    return { error: 'All required fields must be filled' }
  }

  if (isNaN(rateEthPerMin) || rateEthPerMin < 0.0001 || rateEthPerMin > 1) {
    return { error: 'Rate must be between 0.0001 and 1 ETH/min' }
  }

  if (systemPrompt.length < 20) {
    return { error: 'System prompt must be at least 20 characters' }
  }

  // Parse agentConfig (sent as JSON string from client form)
  let agentConfig: AgentConfig = DEFAULT_AGENT_CONFIG
  if (agentConfigRaw) {
    try {
      agentConfig = { ...DEFAULT_AGENT_CONFIG, ...JSON.parse(agentConfigRaw) }
    } catch {
      // Use defaults if parse fails
    }
  }

  // Generate unique slug
  const baseSlug = slugify(name)
  const service  = getServiceClient()

  // Check slug uniqueness, append random suffix if taken
  let slug = baseSlug
  const { count } = await service
    .from('channels')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug)

  if (count && count > 0) {
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
  }

  // Encrypt API key via Supabase pgcrypto RPC
  const { data: encryptedKey, error: encErr } = await service
    .rpc('encrypt_api_key', { key: apiKey })

  if (encErr || !encryptedKey) {
    console.error('encrypt_api_key RPC error:', encErr?.message)
    return { error: 'Failed to encrypt API key — check pgcrypto setup' }
  }

  // Insert channel
  const { data: channel, error: insertErr } = await service
    .from('channels')
    .insert({
      creator_id:           user.id,
      name,
      slug,
      bio,
      provider,
      model,
      system_prompt:        systemPrompt,
      encrypted_api_key:    encryptedKey,
      personality_template: personalityTemplate || null,
      agent_config:         agentConfig,
      rate_eth_per_min:     rateEthPerMin,
      is_active:            true,
    })
    .select('slug')
    .single()

  if (insertErr) {
    console.error('Channel insert error:', insertErr.message)
    return { error: insertErr.message }
  }

  revalidatePath('/explore')
  revalidatePath('/profile')
  redirect(`/channel/${channel.slug}`)
}

// ── updateChannel ────────────────────────────────────────────────────────────

export async function updateChannel(channelId: string, formData: FormData) {
  const supabase = await getSessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const service = getServiceClient()

  // Verify ownership
  const { data: existing } = await service
    .from('channels')
    .select('creator_id, slug')
    .eq('id', channelId)
    .single()

  if (!existing || existing.creator_id !== user.id) {
    return { error: 'Not authorized' }
  }

  const updates: Record<string, unknown> = {}

  const name         = formData.get('name') as string | null
  const bio          = formData.get('bio') as string | null
  const systemPrompt = formData.get('systemPrompt') as string | null
  const rateRaw      = formData.get('rateEthPerMin') as string | null
  const isActiveRaw  = formData.get('isActive') as string | null
  const agentCfgRaw  = formData.get('agentConfig') as string | null
  const newApiKey    = formData.get('apiKey') as string | null

  if (name)         updates.name          = name.trim()
  if (bio !== null) updates.bio           = bio.trim()
  if (systemPrompt) updates.system_prompt = systemPrompt.trim()
  if (rateRaw)      updates.rate_eth_per_min = parseFloat(rateRaw)
  if (isActiveRaw !== null) updates.is_active = isActiveRaw === 'true'
  if (agentCfgRaw) {
    try { updates.agent_config = JSON.parse(agentCfgRaw) } catch {}
  }

  // Re-encrypt API key if provided
  if (newApiKey?.trim()) {
    const { data: enc, error: encErr } = await service
      .rpc('encrypt_api_key', { key: newApiKey.trim() })
    if (!encErr && enc) updates.encrypted_api_key = enc
  }

  updates.updated_at = new Date().toISOString()

  const { error } = await service
    .from('channels')
    .update(updates)
    .eq('id', channelId)

  if (error) return { error: error.message }

  revalidatePath(`/channel/${existing.slug}`)
  revalidatePath('/profile')
  return { success: true }
}

// ── deleteChannel ────────────────────────────────────────────────────────────

export async function deleteChannel(channelId: string) {
  const supabase = await getSessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const service = getServiceClient()

  const { data: existing } = await service
    .from('channels')
    .select('creator_id')
    .eq('id', channelId)
    .single()

  if (!existing || existing.creator_id !== user.id) {
    return { error: 'Not authorized' }
  }

  // Soft delete: set is_active = false
  const { error } = await service
    .from('channels')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', channelId)

  if (error) return { error: error.message }

  revalidatePath('/explore')
  revalidatePath('/profile')
  return { success: true }
}

// ── Stream lifecycle ─────────────────────────────────────────────────────────

export async function startChannelStream(channelId: string) {
  const supabase = await getSessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const service = getServiceClient()

  // Check no existing active stream
  const { data: existing } = await service
    .from('subscriptions')
    .select('id, status')
    .eq('channel_id', channelId)
    .eq('subscriber_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) return { data: existing }

  const streamId = `stream_${crypto.randomUUID()}`

  const { data, error } = await service
    .from('subscriptions')
    .insert({
      channel_id:    channelId,
      subscriber_id: user.id,
      stream_id:     streamId,
      status:        'active',
      started_at:    new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Increment subscriber count
  await service.rpc('increment_subscribers', { channel_id: channelId })

  revalidatePath(`/channel/${channelId}/room`)
  return { data }
}

export async function pauseChannelStream(subscriptionId: string) {
  const supabase = await getSessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const service = getServiceClient()

  const { error } = await service
    .from('subscriptions')
    .update({ status: 'paused', paused_at: new Date().toISOString() })
    .eq('id', subscriptionId)
    .eq('subscriber_id', user.id)   // ownership check

  if (error) return { error: error.message }
  return { success: true }
}

export async function resumeChannelStream(subscriptionId: string) {
  const supabase = await getSessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const service = getServiceClient()

  const { error } = await service
    .from('subscriptions')
    .update({ status: 'active', paused_at: null })
    .eq('id', subscriptionId)
    .eq('subscriber_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function endChannelStream(
  subscriptionId: string,
  totalCostEth: number,
  totalTokens: number
) {
  const supabase = await getSessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const service = getServiceClient()

  // Fetch sub to get channel_id for revenue update
  const { data: sub } = await service
    .from('subscriptions')
    .select('channel_id')
    .eq('id', subscriptionId)
    .eq('subscriber_id', user.id)
    .single()

  if (!sub) return { error: 'Subscription not found' }

  const { error } = await service
    .from('subscriptions')
    .update({
      status:         'ended',
      ended_at:       new Date().toISOString(),
      total_cost_eth: totalCostEth,
      total_tokens:   totalTokens,
    })
    .eq('id', subscriptionId)
    .eq('subscriber_id', user.id)

  if (error) return { error: error.message }

  // Update channel total_revenue
  await service.rpc('add_channel_revenue', {
    channel_id: sub.channel_id,
    amount:     totalCostEth,
  })

  // Clear agent runner in-memory history
  try {
    await fetch(`${process.env.AGENT_RUNNER_URL}/history/${sub.channel_id}`, {
      method: 'DELETE',
      headers: { 'X-Internal-Secret': process.env.INTERNAL_SECRET ?? '' },
    })
  } catch { /* non-critical */ }

  revalidatePath(`/channel/${sub.channel_id}`)
  return { success: true }
}
