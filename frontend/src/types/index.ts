/**
 * Timpa SocialFi — Core TypeScript Types
 */

// ============================================================
// ENUMS
// ============================================================

export enum LLMProvider {
  Anthropic = 'anthropic',
  OpenAI    = 'openai',
  Groq      = 'groq',
  Gemini    = 'gemini',
  Together  = 'together',
}

export enum SubscriptionStatus {
  Active = 'active',
  Paused = 'paused',
  Ended  = 'ended',
}

export enum StreamStatus {
  Active = 'active',
  Paused = 'paused',
  Ended  = 'ended',
}

// ============================================================
// DOMAIN TYPES
// ============================================================

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  wallet_address: string | null
  referral_code: string
  referred_by: string | null
  total_earnings: number
  created_at: string
}

export interface Channel {
  id: string
  creator_id: string
  name: string
  slug: string
  bio: string | null
  provider: LLMProvider
  model: string
  system_prompt: string
  encrypted_api_key: string       // never expose plaintext to client
  personality_template: string | null
  agent_config: AgentConfig        // LLM tuning (temperature, maxTokens, noEmoji…)
  rate_eth_per_min: number
  is_active: boolean
  total_subscribers: number
  total_revenue: number
  created_at: string
  updated_at: string
  // Joined
  creator?: Profile
}

export interface Subscription {
  id: string
  channel_id: string
  subscriber_id: string
  stream_id: string | null
  status: SubscriptionStatus
  started_at: string
  paused_at: string | null
  ended_at: string | null
  total_cost_eth: number
  total_tokens: number
  // Joined
  channel?: Channel
  subscriber?: Profile
}

export interface Message {
  id: string
  channel_id: string
  sender_id: string | null
  is_agent: boolean
  content: string
  created_at: string
  // Joined
  sender?: Profile
}

export interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  reward_eth: number
  paid_at: string | null
}

// ============================================================
// TEMPO MPP STREAM
// ============================================================

export interface TempoStream {
  streamId: string
  channelId: string
  ratePerMin: number          // in ETH
  status: StreamStatus
  startedAt: Date
  totalCost: number           // in ETH
  tokensUsed?: number
}

export interface TempoConfig {
  providerAddress: string     // channel creator wallet
  subscriberAddress: string   // subscriber wallet
  rateEthPerMin: number
  channelId: string
}

// ============================================================
// FORM TYPES
// ============================================================

export interface CreateChannelForm {
  name: string
  slug: string
  bio: string
  provider: LLMProvider
  model: string
  apiKey: string
  systemPrompt: string
  personalityTemplate: string | null
  rateEthPerMin: number
  agentConfig: AgentConfig
}

export interface UpdateChannelForm {
  name?: string
  bio?: string
  systemPrompt?: string
  personalityTemplate?: string | null
  rateEthPerMin?: number
  isActive?: boolean
}

export interface SignUpForm {
  email: string
  password: string
  username: string
  referralCode?: string
}

export interface SignInForm {
  email: string
  password: string
}

// ============================================================
// AGENT CONFIG — per-channel LLM tuning
// ============================================================

export interface AgentConfig {
  temperature: number       // 0.0 – 1.0
  maxTokens: number         // max tokens per response
  noEmoji: boolean          // strip emoji from output
  proactiveIntervalMin: number  // seconds (min of jitter range)
  proactiveIntervalMax: number  // seconds (max of jitter range)
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  temperature: 0.85,
  maxTokens: 256,
  noEmoji: false,
  proactiveIntervalMin: 5,
  proactiveIntervalMax: 10,
}

// ============================================================
// PERSONALITY TEMPLATES
// ============================================================

export interface PersonalityTemplate {
  id: string
  label: string
  emoji: string
  name: string
  systemPrompt: string
  suggestedProvider: LLMProvider
  suggestedModel: string
  description: string
  agentConfig?: Partial<AgentConfig>  // optional overrides from template
}

// ============================================================
// PROVIDER → MODEL MAP
// ============================================================

export const PROVIDER_MODELS: Record<LLMProvider, string[]> = {
  [LLMProvider.Anthropic]: [
    'claude-opus-4-5',
    'claude-sonnet-4-5',
    'claude-3-5-haiku-20241022',
  ],
  [LLMProvider.OpenAI]: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
  ],
  [LLMProvider.Groq]: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
  ],
  [LLMProvider.Gemini]: [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-2.0-flash-exp',
  ],
  [LLMProvider.Together]: [
    'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    'mistralai/Mixtral-8x22B-Instruct-v0.1',
    'Qwen/Qwen2.5-72B-Instruct-Turbo',
  ],
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface AgentRunnerRequest {
  channel_id: string
  user_message?: string
  creator_api_key: string
  system_prompt: string
  model: string
  provider: string
  conversation_history?: Array<{ role: string; content: string }>
  // Per-channel LLM tuning
  temperature?: number
  max_tokens?: number
  no_emoji?: boolean
}

export interface AgentRunnerResponse {
  response: string
  tokens_used: number
  model: string
}

export interface TestApiKeyRequest {
  provider: LLMProvider
  apiKey: string
  model: string
}

export interface TestApiKeyResponse {
  valid: boolean
  error?: string
}
