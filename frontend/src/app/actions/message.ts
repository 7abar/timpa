/**
 * Message Server Actions
 */
'use server'

import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'

/**
 * sendMessage — inserts user message, calls agent runner, inserts agent response
 */
export async function sendMessage(channelId: string, content: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }
  if (!content.trim()) return { error: 'Message cannot be empty' }

  // Verify user has active subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('channel_id', channelId)
    .eq('subscriber_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!sub) return { error: 'No active stream for this channel' }

  // Insert user message
  const admin = await createSupabaseAdminClient()

  const { error: insertError } = await admin
    .from('messages')
    .insert({
      channel_id: channelId,
      sender_id: user.id,
      is_agent: false,
      content: content.trim(),
    })

  if (insertError) {
    console.error('Message insert error:', insertError.message)
    return { error: 'Failed to send message' }
  }

  // Call agent runner API route (which handles decryption + calling agent-runner service)
  try {
    const agentRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId,
        userMessage: content.trim(),
      }),
    })

    if (!agentRes.ok) {
      console.error('Agent API error:', agentRes.status)
      // Non-fatal — user message was saved, agent will respond on next poll
    }
  } catch (err) {
    console.error('Agent call failed:', err)
    // Non-fatal
  }

  return { success: true }
}

/**
 * getMessages — fetch messages with pagination
 */
export async function getMessages(channelId: string, limit = 50, before?: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated', messages: [] }

  let query = supabase
    .from('messages')
    .select('*, sender:profiles(id, username, avatar_url)')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data, error } = await query

  if (error) return { error: error.message, messages: [] }

  // Reverse to ascending order for display
  return { messages: (data ?? []).reverse() }
}
