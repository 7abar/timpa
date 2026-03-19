/**
 * Supabase Database Type Definitions
 * Auto-generated shape — extend as schema evolves.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
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
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          bio?: string | null
          wallet_address?: string | null
          referral_code?: string
          referred_by?: string | null
          total_earnings?: number
          created_at?: string
        }
        Update: {
          username?: string
          avatar_url?: string | null
          bio?: string | null
          wallet_address?: string | null
          referral_code?: string
          referred_by?: string | null
          total_earnings?: number
        }
      }
      channels: {
        Row: {
          id: string
          creator_id: string
          name: string
          slug: string
          bio: string | null
          provider: string
          model: string
          system_prompt: string
          encrypted_api_key: string
          personality_template: string | null
          rate_eth_per_min: number
          is_active: boolean
          total_subscribers: number
          total_revenue: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          name: string
          slug: string
          bio?: string | null
          provider: string
          model: string
          system_prompt?: string
          encrypted_api_key: string
          personality_template?: string | null
          rate_eth_per_min?: number
          is_active?: boolean
          total_subscribers?: number
          total_revenue?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          bio?: string | null
          provider?: string
          model?: string
          system_prompt?: string
          encrypted_api_key?: string
          personality_template?: string | null
          rate_eth_per_min?: number
          is_active?: boolean
          total_subscribers?: number
          total_revenue?: number
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          channel_id: string
          subscriber_id: string
          stream_id: string | null
          status: 'active' | 'paused' | 'ended'
          started_at: string
          paused_at: string | null
          ended_at: string | null
          total_cost_eth: number
          total_tokens: number
        }
        Insert: {
          id?: string
          channel_id: string
          subscriber_id: string
          stream_id?: string | null
          status?: 'active' | 'paused' | 'ended'
          started_at?: string
          paused_at?: string | null
          ended_at?: string | null
          total_cost_eth?: number
          total_tokens?: number
        }
        Update: {
          stream_id?: string | null
          status?: 'active' | 'paused' | 'ended'
          paused_at?: string | null
          ended_at?: string | null
          total_cost_eth?: number
          total_tokens?: number
        }
      }
      messages: {
        Row: {
          id: string
          channel_id: string
          sender_id: string | null
          is_agent: boolean
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          sender_id?: string | null
          is_agent?: boolean
          content: string
          created_at?: string
        }
        Update: never
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          reward_eth: number
          paid_at: string | null
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id: string
          reward_eth?: number
          paid_at?: string | null
        }
        Update: {
          reward_eth?: number
          paid_at?: string | null
        }
      }
    }
    Functions: {
      encrypt_api_key: {
        Args: { key_text: string }
        Returns: string
      }
      decrypt_api_key: {
        Args: { encrypted_text: string }
        Returns: string
      }
    }
    Enums: Record<string, never>
  }
}
