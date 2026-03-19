/**
 * /api/agent — internal proxy to the Agent Runner
 *
 * POST /api/agent/run        — user sent a message, get immediate reply
 * POST /api/agent/proactive  — frontend polling loop, get unprompted agent post
 *
 * This route:
 *   1. Authenticates the request (Supabase session)
 *   2. Fetches channel from DB and decrypts creator API key server-side
 *   3. Forwards to agent-runner with X-Internal-Secret
 *   4. Streams/returns the response to the client
 *
 * Rate limit: enforced in agent-runner per channel. Here we add a basic
 * per-request guard (no hammering the route itself).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const AGENT_RUNNER_URL = process.env.AGENT_RUNNER_URL ?? 'http://localhost:8000'
const INTERNAL_SECRET  = process.env.INTERNAL_SECRET ?? ''

// Simple in-process rate map: channel_id → last call timestamp
// (backs up the agent-runner's own rate limiter)
const _lastCall = new Map<string, number>()
const RATE_LIMIT_MS = 2_000  // 2s minimum between calls per channel

async function getSupabaseUser(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
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
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

async function handler(req: NextRequest, endpoint: 'run' | 'proactive') {
  // Auth
  const { supabase, user } = await getSupabaseUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    channelId: string
    userMessage?: string
    conversationHistory?: Array<{ role: string; content: string }>
  }

  const { channelId, userMessage, conversationHistory = [] } = body

  if (!channelId) {
    return NextResponse.json({ error: 'channelId required' }, { status: 400 })
  }

  // Rate limit guard
  const now = Date.now()
  const last = _lastCall.get(channelId) ?? 0
  if (now - last < RATE_LIMIT_MS) {
    return NextResponse.json({ error: 'Rate limit: too fast' }, { status: 429 })
  }
  _lastCall.set(channelId, now)

  // Verify the user has an active subscription to this channel
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('channel_id', channelId)
    .eq('subscriber_id', user.id)
    .eq('status', 'active')
    .single()

  if (!subscription) {
    return NextResponse.json({ error: 'No active stream for this channel' }, { status: 403 })
  }

  // Fetch channel (needs service role to decrypt API key)
  const serviceSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // decrypt_api_key is a DB function that uses pgcrypto + ENCRYPTION_KEY
  const { data: channel, error: chErr } = await serviceSupabase
    .from('channels')
    .select(`
      id, provider, model, system_prompt, rate_eth_per_min, creator_id,
      encrypted_api_key
    `)
    .eq('id', channelId)
    .eq('is_active', true)
    .single()

  if (chErr || !channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  // Decrypt API key via Supabase RPC
  const { data: decrypted, error: decErr } = await serviceSupabase
    .rpc('decrypt_api_key', { encrypted: channel.encrypted_api_key })

  if (decErr || !decrypted) {
    console.error('Decrypt error:', decErr?.message)
    return NextResponse.json({ error: 'Could not decrypt API key' }, { status: 500 })
  }

  // Forward to agent runner
  const runnerBody = {
    channel_id: channelId,
    creator_api_key: decrypted,          // never logged, passed direct to runner
    system_prompt: channel.system_prompt,
    model: channel.model,
    provider: channel.provider,
    conversation_history: conversationHistory.slice(-10),
    ...(endpoint === 'run' && userMessage ? { user_message: userMessage } : {}),
  }

  let runnerRes: Response
  try {
    runnerRes = await fetch(`${AGENT_RUNNER_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SECRET,
        'X-Channel-Id': channelId,   // used by agent-runner rate limiter key
      },
      body: JSON.stringify(runnerBody),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (err) {
    console.error('Agent runner unreachable:', err)
    return NextResponse.json({ error: 'Agent runner unavailable' }, { status: 503 })
  }

  if (!runnerRes.ok) {
    const detail = await runnerRes.text()
    return NextResponse.json({ error: detail }, { status: runnerRes.status })
  }

  const data = await runnerRes.json()

  // Optionally: persist agent message to DB here
  // (or let the client-side do it after receiving the response)

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  // Determine endpoint from URL: /api/agent/run or /api/agent/proactive
  const url = new URL(req.url)
  const parts = url.pathname.split('/')
  const endpoint = parts[parts.length - 1] as 'run' | 'proactive'

  if (endpoint !== 'run' && endpoint !== 'proactive') {
    return NextResponse.json({ error: 'Unknown endpoint' }, { status: 404 })
  }

  return handler(req, endpoint)
}
