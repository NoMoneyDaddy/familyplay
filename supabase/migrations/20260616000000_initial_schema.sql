-- FamilyPlay 初始 Schema
-- Sprint 1 — 建立所有資料表與 RLS Policy

-- ─────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────

CREATE TABLE user_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  avatar_url      TEXT,
  encryption_salt TEXT,  -- random per-user salt for Plus client-side encryption
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE households (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT,
  owner_id   UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE household_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('owner', 'caregiver', 'viewer')),
  nickname        TEXT,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, user_profile_id)
);

CREATE TABLE child_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id     UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  nickname         TEXT NOT NULL,
  birth_year_month TEXT,  -- YYYY-MM，不收集完整生日
  stage_key        TEXT,  -- 快取的計算值
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE child_capability_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     UUID UNIQUE NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  capabilities JSONB DEFAULT '{}',
  zpd_targets  TEXT[] DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE companion_activities (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT NOT NULL,
  description           TEXT,
  opening_line          TEXT NOT NULL,
  steps                 JSONB NOT NULL DEFAULT '[]',
  follow_up_questions   JSONB DEFAULT '[]',
  safety_notes          TEXT,
  ending_line           TEXT,

  min_age_months        INTEGER,
  max_age_months        INTEGER,
  required_capabilities TEXT[] DEFAULT '{}',
  optional_capabilities TEXT[] DEFAULT '{}',
  zpd_targets           TEXT[] DEFAULT '{}',
  developmental_focus   TEXT[] DEFAULT '{}',
  stimulation_level     TEXT CHECK (stimulation_level IN ('low', 'medium', 'high')),
  play_type             TEXT CHECK (play_type IN ('solitary', 'parallel', 'associative', 'cooperative')),

  required_resources    TEXT[] DEFAULT '{}',
  space_requirement     TEXT DEFAULT 'anywhere',
  min_duration_minutes  INTEGER DEFAULT 5,
  max_duration_minutes  INTEGER DEFAULT 30,

  is_bedtime_safe       BOOLEAN DEFAULT FALSE,
  is_sick_day_safe      BOOLEAN DEFAULT FALSE,
  elderly_friendly      BOOLEAN DEFAULT FALSE,

  season_tags           TEXT[] DEFAULT '{}',
  holiday_tags          TEXT[] DEFAULT '{}',
  companion_type        TEXT CHECK (companion_type IN ('play', 'talk', 'read', 'outdoor', 'creative', 'sensory', 'music', 'calm_down')),

  is_fallback           BOOLEAN DEFAULT FALSE,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE companion_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id       UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  caregiver_id   UUID NOT NULL REFERENCES user_profiles(id),
  activity_id    UUID REFERENCES companion_activities(id),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_secs  INTEGER,
  outcome        TEXT CHECK (outcome IN ('completed', 'tried', 'abandoned')),
  child_reaction TEXT CHECK (child_reaction IN ('happy', 'engaged', 'neutral', 'leaving', 'disinterested', 'calmed')),
  notes          TEXT,  -- encrypted for Plus users
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE household_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  token        TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  role         TEXT NOT NULL CHECK (role IN ('caregiver', 'viewer')),
  created_by   UUID NOT NULL REFERENCES user_profiles(id),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  used_at      TIMESTAMPTZ,
  used_by      UUID REFERENCES user_profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE entitlements (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id             UUID UNIQUE NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  plan                        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'supporter', 'plus')),
  plus_ai_calls_remaining     INTEGER DEFAULT 0,
  plus_ai_calls_reset_at      TIMESTAMPTZ,
  lemonsqueezy_subscription_id TEXT,   -- web 付費
  revenuecat_customer_id      TEXT,    -- mobile 付費
  supporter_purchased_at      TIMESTAMPTZ,
  plus_started_at             TIMESTAMPTZ,
  plus_ends_at                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE handoff_summaries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id     UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  child_id         UUID NOT NULL REFERENCES child_profiles(id),
  created_by       UUID NOT NULL REFERENCES user_profiles(id),
  summary_text     TEXT,
  logs_referenced  UUID[] DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE app_configs (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sponsor_cards (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  body               TEXT NOT NULL,
  cta_text           TEXT,
  cta_url            TEXT,
  allowed_placements TEXT[] NOT NULL DEFAULT '{}',
  is_active          BOOLEAN DEFAULT TRUE,
  starts_at          TIMESTAMPTZ,
  ends_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────

CREATE INDEX idx_household_members_household   ON household_members(household_id);
CREATE INDEX idx_household_members_user        ON household_members(user_profile_id);
CREATE INDEX idx_child_profiles_household      ON child_profiles(household_id);
CREATE INDEX idx_companion_logs_child          ON companion_logs(child_id);
CREATE INDEX idx_companion_logs_household      ON companion_logs(household_id);
CREATE INDEX idx_companion_logs_started        ON companion_logs(started_at DESC);
CREATE INDEX idx_companion_activities_active   ON companion_activities(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_household_invites_token       ON household_invites(token) WHERE used_at IS NULL;
CREATE INDEX idx_household_invites_expires     ON household_invites(expires_at);

-- ─────────────────────────────────────────────────────────
-- updated_at Trigger
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at    BEFORE UPDATE ON user_profiles    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER child_profiles_updated_at   BEFORE UPDATE ON child_profiles   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER entitlements_updated_at     BEFORE UPDATE ON entitlements     FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────

ALTER TABLE user_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE households               ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_capability_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_invites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE handoff_summaries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_configs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_cards            ENABLE ROW LEVEL SECURITY;

-- Helper: 取得目前用戶的 profile id
CREATE OR REPLACE FUNCTION auth_profile_id()
RETURNS UUID AS $$
  SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: 取得目前用戶所屬的所有 household id
CREATE OR REPLACE FUNCTION my_household_ids()
RETURNS SETOF UUID AS $$
  SELECT household_id
  FROM household_members
  WHERE user_profile_id = auth_profile_id()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- user_profiles
CREATE POLICY "own_profile_select" ON user_profiles FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "own_profile_insert" ON user_profiles FOR INSERT WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "own_profile_update" ON user_profiles FOR UPDATE USING (auth_user_id = auth.uid());

-- households
CREATE POLICY "members_can_read_household"   ON households FOR SELECT USING (id IN (SELECT my_household_ids()));
CREATE POLICY "owner_create_household"        ON households FOR INSERT WITH CHECK (owner_id = auth_profile_id());
CREATE POLICY "owner_update_household"        ON households FOR UPDATE USING (owner_id = auth_profile_id());
CREATE POLICY "owner_delete_household"        ON households FOR DELETE USING (owner_id = auth_profile_id());

-- household_members
CREATE POLICY "members_read_members"  ON household_members FOR SELECT USING (household_id IN (SELECT my_household_ids()));
CREATE POLICY "join_own_household"    ON household_members FOR INSERT WITH CHECK (user_profile_id = auth_profile_id());
CREATE POLICY "owner_manage_members"  ON household_members FOR DELETE
  USING (household_id IN (SELECT id FROM households WHERE owner_id = auth_profile_id()));

-- child_profiles
CREATE POLICY "members_read_children"     ON child_profiles FOR SELECT USING (household_id IN (SELECT my_household_ids()));
CREATE POLICY "caregivers_create_child"   ON child_profiles FOR INSERT WITH CHECK (household_id IN (SELECT my_household_ids()));
CREATE POLICY "caregivers_update_child"   ON child_profiles FOR UPDATE USING (household_id IN (SELECT my_household_ids()));
CREATE POLICY "owner_delete_child"        ON child_profiles FOR DELETE
  USING (household_id IN (SELECT id FROM households WHERE owner_id = auth_profile_id()));

-- child_capability_profiles
CREATE POLICY "members_manage_capabilities" ON child_capability_profiles FOR ALL
  USING (child_id IN (SELECT id FROM child_profiles WHERE household_id IN (SELECT my_household_ids())));

-- companion_activities（公共內容，所有登入用戶可讀）
CREATE POLICY "any_authenticated_read_activities" ON companion_activities FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- companion_logs
CREATE POLICY "members_read_logs"    ON companion_logs FOR SELECT USING (household_id IN (SELECT my_household_ids()));
CREATE POLICY "caregivers_write_log" ON companion_logs FOR INSERT
  WITH CHECK (household_id IN (SELECT my_household_ids()) AND caregiver_id = auth_profile_id());
CREATE POLICY "log_owner_update"     ON companion_logs FOR UPDATE USING (caregiver_id = auth_profile_id());

-- household_invites
CREATE POLICY "members_read_invites"  ON household_invites FOR SELECT USING (household_id IN (SELECT my_household_ids()));
CREATE POLICY "members_create_invite" ON household_invites FOR INSERT
  WITH CHECK (household_id IN (SELECT my_household_ids()) AND created_by = auth_profile_id());
CREATE POLICY "creator_delete_invite" ON household_invites FOR DELETE USING (created_by = auth_profile_id());

-- entitlements
CREATE POLICY "own_entitlement" ON entitlements FOR ALL USING (user_profile_id = auth_profile_id());

-- handoff_summaries
CREATE POLICY "members_read_handoffs"   ON handoff_summaries FOR SELECT USING (household_id IN (SELECT my_household_ids()));
CREATE POLICY "members_create_handoffs" ON handoff_summaries FOR INSERT
  WITH CHECK (household_id IN (SELECT my_household_ids()) AND created_by = auth_profile_id());

-- app_configs（所有人可讀）
CREATE POLICY "anyone_read_config" ON app_configs FOR SELECT USING (TRUE);

-- sponsor_cards（所有人可讀啟用的廣告）
CREATE POLICY "anyone_read_active_ads" ON sponsor_cards FOR SELECT
  USING (is_active = TRUE AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at > NOW()));

-- ─────────────────────────────────────────────────────────
-- 預設 App Config
-- ─────────────────────────────────────────────────────────

INSERT INTO app_configs (key, value, description) VALUES
  ('ads_enabled',           'false',               '是否啟用廣告'),
  ('ai_enabled',            'true',                '是否啟用 AI 功能'),
  ('plus_ai_monthly_quota', '30',                  'Plus 用戶每月 AI 次數'),
  ('rate_limit_per_minute', '10',                  'AI 每用戶每分鐘限制'),
  ('maintenance_mode',      'false',               '維護模式'),
  ('ios_pwa_install_hint',  'true',                '在 iOS Safari 顯示安裝提示');
