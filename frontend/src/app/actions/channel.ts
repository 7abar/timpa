/**
 * Channel Server Actions
 */
'use server'

import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'

/**
 * createChannel — validates input, encrypts API key, inserts channel
 */
export async function createChannel(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const name = formData.get('name') as string
  const slug = slugify(formData.get('slug') as string || name)
  const bio = formData.get('bio') as string
  const provider = formData.get('provider') as string
  const model = formData.get('model') as string
  const apiKey = formData.get('apiKey') as string
  const systemPrompt = formData.get('systemPrompt') as string
  const personalityTemplate = formData.get('personalityTemplate') as string || null
  const rateEthPerMin = parseFloat(formData.get('rateEthPerMin') as string)

  // Validate required fields
  if (!name || !provider || !model || !apiKey || !systemPrompt) {
    return { error: 'Missing required fields' }
  }

  if (rateEthPerMin < 0.001 || rateEthPerMin > 0.1) {
    return { error: 'Rate must be between 0.001 and 0.1 ETH/min' }
  }

  // Check slug uniqueness
  const { data: existingSlug } = await supabase
    .from('channels')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existingSlug) {
    return { error: 'Channel slug already taken. Try a different name.' }
  }

  // Encrypt the API key via pgcrypto helper function
  const admin = await createSupabaseAdminClient()
  const { data: encryptedKey, error: encryptError } = await admin
    .rpc('encrypt_api_key', { key_text: apiKey })

  if (encryptError || !encryptedKey) {
    console.error('Encryption error:', encryptError?.message)
    return { error: 'Failed to encrypt API key. Contact support.' }
  }

  // Insert channel
  const { error: insertError } = await supabase
    .from('channels')
    .insert({
      creator_id: user.id,
      name,
      slug,
      bio: bio || null,
      provider,
      model,
      system_prompt: systemPrompt,
      encrypted_api_key: encryptedKey as string,
      personality_template: personalityTemplate,
      rate_eth_per_min: rateEthPerMin,
    })

  if (insertError) {
    console.error('Insert error:', insertError.message)
    return { error: insertError.message }
  }

  return { success: true, slug }
}

/**
 * updateChannel — creator-only update
 */
export async function updateChannel(
  channelId: string,
  data: {
    name?: string
    bio?: string
    systemPrompt?: string
    personalityTemplate?: string | null
    rateEthPerMin?: number
    isActive?: boolean
  }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const updates: Record<string, unknown> = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.bio !== undefined) updates.bio = data.bio
  if (data.systemPrompt !== undefined) updates.system_prompt = data.systemPrompt
  if (data.personalityTemplate !== undefined) updates.personality_template = data.personalityTemplate
  if (data.rateEthPerMin !== undefined) updates.rate_eth_per_min = data.rateEthPerMin
  if (data.isActive !== undefined) updates.is_active = data.isActive

  const { error } = await supabase
    .from('channels')
    .update(updates)
    .eq('id', channelId)
    .eq('creator_id', user.id)  // RLS + explicit check

  if (error) return { error: error.message }
  return { success: true }
}

/**
 * deleteChannel — soft delete (set is_active = false)
 */
export async function deleteChannel(channelId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('channels')
    .update({ is_active: false })
    .eq('id', channelId)
    .eq('creator_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

/**
 * startChannelStream — creates a subscription record and returns streamId
 */
export async function startChannelStream(channelId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // Check channel exists and is active
  const { data: channel } = await supabase
    .from('channels')
    .select('id, creator_id')
    .eq('id', channelId)
    .eq('is_active', true)
    .single()

  if (!channel) return { error: 'Channel not found or inactive' }

  // Check for existing active subscription
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('channel_id', channelId)
    .eq('subscriber_id', user.id)
    .in('status', ['active', 'paused'])
    .maybeSingle()

  if (existing) {
    return { error: 'Already subscribed to this channel', subscriptionId: existing.id }
  }

  // Generate stream ID
  const streamId = `stream_${channelId}_${Date.now()}`

  // Create subscription
  const { data: sub, error } = await supabase
    .from('subscriptions')
    .insert({
      channel_id: channelId,
      subscriber_id: user.id,
      stream_id: streamId,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Increment subscriber count via admin client
  const admin = await createSupabaseAdminClient()
  const { data: ch } = await admin
    .from('channels')
    .select('total_subscribers')
    .eq('id', channelId)
    .single()

  if (ch) {
    await admin
      .from('channels')
      .update({ total_subscribers: ((ch as any).total_subscribers ?? 0) + 1 })
      .eq('id', channelId)
  }

  return { success: true, subscriptionId: sub.id, streamId }
}

/**
 * pauseChannelStream — sets subscription status to paused
 */
export async function pauseChannelStream(subscriptionId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'paused' as const,
      paused_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .eq('subscriber_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

/**
 * resumeChannelStream — sets subscription status back to active
 */
export async function resumeChannelStream(subscriptionId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active' as const,
      paused_at: null,
    })
    .eq('id', subscriptionId)
    .eq('subscriber_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

/**
 * endChannelStream — finalizes the subscription, updates revenue
 */
export async function endChannelStream(
  subscriptionId: string,
  totalCost: number,
  totalTokens: number
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // Get subscription to find channel
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('channel_id')
    .eq('id', subscriptionId)
    .eq('subscriber_id', user.id)
    .single()

  if (!sub) return { error: 'Subscription not found' }

  // Update subscription
  const { error: subError } = await supabase
    .from('subscriptions')
    .update({
      status: 'ended' as const,
      ended_at: new Date().toISOString(),
      total_cost_eth: totalCost,
      total_tokens: totalTokens,
    })
    .eq('id', subscriptionId)
    .eq('subscriber_id', user.id)

  if (subError) return { error: subError.message }

  // Update channel total revenue and creator earnings
  const admin = await createSupabaseAdminClient()

  const { data: channel } = await admin
    .from('channels')
    .select('total_revenue, creator_id')
    .eq('id', sub.channel_id)
    .single()

  if (channel) {
    await admin
      .from('channels')
      .update({ total_revenue: (channel.total_revenue ?? 0) + totalCost })
      .eq('id', sub.channel_id)

    // Update creator earnings
    const { data: profile } = await admin
      .from('profiles')
      .select('total_earnings')
      .eq('id', channel.creator_id)
      .single()

    if (profile) {
      await admin
        .from('profiles')
        .update({ total_earnings: (profile.total_earnings ?? 0) + totalCost })
        .eq('id', channel.creator_id)
    }
  }

  return { success: true }
}
