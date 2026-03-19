-- ============================================================
-- Timpa SocialFi - Initial Schema
-- Migration: 001_initial.sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE NOT NULL,
  avatar_url      TEXT,
  bio             TEXT,
  wallet_address  TEXT,
  referral_code   TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  referred_by     TEXT REFERENCES public.profiles(referral_code),
  total_earnings  NUMERIC(18, 8) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHANNELS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.channels (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  slug                 TEXT UNIQUE NOT NULL,
  bio                  TEXT,
  provider             TEXT NOT NULL,                        -- anthropic | openai | groq | gemini | together
  model                TEXT NOT NULL,
  system_prompt        TEXT NOT NULL DEFAULT '',
  encrypted_api_key    TEXT NOT NULL,                        -- pgcrypto encrypted
  personality_template TEXT,
  rate_eth_per_min     NUMERIC(18, 8) NOT NULL DEFAULT 0.001,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  total_subscribers    INTEGER NOT NULL DEFAULT 0,
  total_revenue        NUMERIC(18, 8) NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id      UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  subscriber_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stream_id       TEXT,                                      -- Tempo MPP stream ID
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'ended')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paused_at       TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  total_cost_eth  NUMERIC(18, 8) NOT NULL DEFAULT 0,
  total_tokens    INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id  UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_agent    BOOLEAN NOT NULL DEFAULT FALSE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REFERRALS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_eth   NUMERIC(18, 8) NOT NULL DEFAULT 0,
  paid_at      TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_channels_slug        ON public.channels(slug);
CREATE INDEX IF NOT EXISTS idx_channels_creator_id  ON public.channels(creator_id);
CREATE INDEX IF NOT EXISTS idx_channels_is_active   ON public.channels(is_active);
CREATE INDEX IF NOT EXISTS idx_channels_total_rev   ON public.channels(total_revenue DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_channel_sub
  ON public.subscriptions(channel_id, subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON public.subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_messages_channel_created
  ON public.messages(channel_id, created_at DESC);

-- ============================================================
-- AUTO-UPDATE updated_at FOR channels
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON AUTH USER SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- ENCRYPTION HELPERS (using ENCRYPTION_KEY from app secrets)
-- ============================================================
-- NOTE: ENCRYPTION_KEY must be set as a Supabase secret / vault secret
-- and passed via app_settings. For simplicity, we use a DB setting.

-- Encrypt an API key using AES via pgcrypto
CREATE OR REPLACE FUNCTION public.encrypt_api_key(key_text TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Read from current_setting (set via app or migration)
  encryption_key := current_setting('app.encryption_key', TRUE);
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'app.encryption_key is not set';
  END IF;
  RETURN encode(
    pgp_sym_encrypt(key_text, encryption_key),
    'base64'
  );
END;
$$;

-- Decrypt an API key
CREATE OR REPLACE FUNCTION public.decrypt_api_key(encrypted_text TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := current_setting('app.encryption_key', TRUE);
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'app.encryption_key is not set';
  END IF;
  RETURN pgp_sym_decrypt(
    decode(encrypted_text, 'base64'),
    encryption_key
  );
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals    ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (TRUE); -- public read for usernames/avatars

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- CHANNELS policies
CREATE POLICY "channels_select_all"
  ON public.channels FOR SELECT
  USING (TRUE); -- public read

CREATE POLICY "channels_insert_creator"
  ON public.channels FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "channels_update_creator"
  ON public.channels FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "channels_delete_creator"
  ON public.channels FOR DELETE
  USING (auth.uid() = creator_id);

-- SUBSCRIPTIONS policies
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = subscriber_id);

CREATE POLICY "subscriptions_insert_own"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "subscriptions_update_own"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = subscriber_id);

-- MESSAGES policies
-- Channel members (active subscribers) can read messages
CREATE POLICY "messages_select_members"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.channel_id = messages.channel_id
        AND s.subscriber_id = auth.uid()
        AND s.status IN ('active', 'paused')
    )
    OR
    -- Creator can also read their channel messages
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = messages.channel_id
        AND c.creator_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_members"
  ON public.messages FOR INSERT
  WITH CHECK (
    -- Agent messages inserted via service role (no user check)
    is_agent = TRUE
    OR
    (
      auth.uid() = sender_id
      AND EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.channel_id = messages.channel_id
          AND s.subscriber_id = auth.uid()
          AND s.status = 'active'
      )
    )
  );

-- REFERRALS policies
CREATE POLICY "referrals_select_own"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "referrals_insert_system"
  ON public.referrals FOR INSERT
  WITH CHECK (FALSE); -- Only service role inserts referrals
