/**
 * POST /api/test-api-key
 * Tests a provider API key by making a minimal call.
 * Never logs the key.
 */
import { NextRequest, NextResponse } from 'next/server'

const PROVIDER_TEST_URLS: Record<string, string> = {
  anthropic: 'https://api.anthropic.com/v1/messages',
  openai:    'https://api.openai.com/v1/chat/completions',
  groq:      'https://api.groq.com/openai/v1/chat/completions',
  gemini:    'https://generativelanguage.googleapis.com/v1beta/models',
  together:  'https://api.together.xyz/v1/chat/completions',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { provider, apiKey, model } = body as {
      provider: string
      apiKey: string
      model: string
    }

    if (!provider || !apiKey || !model) {
      return NextResponse.json(
        { valid: false, error: 'Missing provider, apiKey, or model' },
        { status: 400 }
      )
    }

    // Minimal test request per provider
    let valid = false
    let error = ''

    try {
      if (provider === 'anthropic') {
        const res = await fetch(PROVIDER_TEST_URLS.anthropic, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 5,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        })
        valid = res.ok || res.status === 200
        if (!valid) {
          const data = await res.json().catch(() => ({}))
          error = data?.error?.message ?? `HTTP ${res.status}`
        }
      } else if (provider === 'gemini') {
        // Gemini uses API key as query param
        const res = await fetch(
          `${PROVIDER_TEST_URLS.gemini}/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Hi' }] }],
              generationConfig: { maxOutputTokens: 5 },
            }),
          }
        )
        valid = res.ok
        if (!valid) {
          const data = await res.json().catch(() => ({}))
          error = data?.error?.message ?? `HTTP ${res.status}`
        }
      } else {
        // OpenAI-compatible: openai, groq, together
        const url = PROVIDER_TEST_URLS[provider]
        if (!url) {
          return NextResponse.json(
            { valid: false, error: `Unknown provider: ${provider}` },
            { status: 400 }
          )
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            max_tokens: 5,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        })
        valid = res.ok
        if (!valid) {
          const data = await res.json().catch(() => ({}))
          error = data?.error?.message ?? `HTTP ${res.status}`
        }
      }
    } catch (fetchErr: unknown) {
      valid = false
      error = fetchErr instanceof Error ? fetchErr.message : 'Network error'
    }

    return NextResponse.json({ valid, error: valid ? undefined : error })
  } catch {
    return NextResponse.json(
      { valid: false, error: 'Invalid request' },
      { status: 400 }
    )
  }
}
