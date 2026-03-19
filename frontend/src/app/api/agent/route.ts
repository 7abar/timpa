/**
 * POST /api/agent
 * Fetches channel from DB, decrypts API key, calls agent-runner service.
 * Rate-limited to 1 call per 5s per channel.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Simple in-memory rate limiter (per channel, 1 call per 5 seconds)
const lastCallMap = new Map<string, number>()
const RATE_LIMIT_MS = 5000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { channelId, userMessage } = body as {
      channelId: string
      userMessage?: string
    }

    if (!channelId) {
      return NextResponse.json({ error: 'channelId required' }, { status: 400 })
    }

    // Rate limit check
    const now = Date.now()
    const lastCall = lastCallMap.get(channelId) ?? 0
    if (now - lastCall < RATE_LIMIT_MS) {
      return NextResponse.json(
        { error: 'Rate limited. Wait before retrying.' },
        { status: 429 }
      )
    }
    lastCallMap.set(channelId, now)

    // Create admin Supabase client to decrypt API key
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    // Fetch channel with creator info
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, system_prompt, model, provider, encrypted_api_key')
      .eq('id', channelId)
      .eq('is_active', true)
      .single()

    if (channelError || !channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // Decrypt the API key
    const { data: decryptedKey, error: decryptError } = await supabase
      .rpc('decrypt_api_key', { encrypted_text: channel.encrypted_api_key })

    if (decryptError || !decryptedKey) {
      console.error('Decryption error:', decryptError?.message)
      return NextResponse.json({ error: 'Failed to decrypt API key' }, { status: 500 })
    }

    // Fetch recent conversation history (last 10 messages)
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('content, is_agent, sender_id')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(10)

    const conversationHistory = (recentMessages ?? [])
      .reverse()
      .map((msg) => ({
        role: msg.is_agent ? 'assistant' : 'user',
        content: msg.content,
      }))

    // Call agent-runner service
    const agentRunnerUrl = process.env.AGENT_RUNNER_URL || 'http://localhost:8000'
    const internalSecret = process.env.INTERNAL_SECRET || ''

    const runnerRes = await fetch(`${agentRunnerUrl}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': internalSecret,
      },
      body: JSON.stringify({
        channel_id: channelId,
        user_message: userMessage ?? null,
        creator_api_key: decryptedKey as string,
        system_prompt: channel.system_prompt,
        model: channel.model,
        provider: channel.provider,
        conversation_history: conversationHistory,
      }),
    })

    if (!runnerRes.ok) {
      const errText = await runnerRes.text().catch(() => 'Unknown error')
      console.error(`Agent runner error (${runnerRes.status}):`, errText)
      return NextResponse.json(
        { error: `Agent runner error: ${runnerRes.status}` },
        { status: 502 }
      )
    }

    const result = await runnerRes.json()

    // Insert agent response as a message
    if (result.response) {
      await supabase.from('messages').insert({
        channel_id: channelId,
        sender_id: null,
        is_agent: true,
        content: result.response,
      })
    }

    return NextResponse.json({
      response: result.response,
      tokens_used: result.tokens_used ?? 0,
      model: result.model,
    })
  } catch (err) {
    console.error('Agent route error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
