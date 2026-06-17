-- FamilyPlay — 結構性修復 Migration
-- 修復三大結構性缺陷 + RLS 強化 + Webhook 冪等性
--
-- 背景（Review 發現）：
--   1. 新用戶註冊後從未建立 user_profiles → 整個已登入功能對真實用戶失效
--   2. 建立 household 時 owner 從未加入 household_members → RLS my_household_ids() 排除 owner 自己
--   3. companion_logs UPDATE policy 缺 WITH CHECK → caregiver 可竄改 household_id/child_id
--   4. invite 建立未限制角色 → viewer 可發 caregiver 邀請（權限提升）
--   5. Webhook 對一次性購買無冪等保護
--
-- 注意：本檔只新增，不修改舊 migration。

-- ─────────────────────────────────────────────────────────
-- 修復 1：auth.users 新增時自動建立 user_profiles + entitlements
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_profile_id UUID;
BEGIN
  -- 建立 profile（display_name 取 OAuth metadata，避免空值）
  INSERT INTO public.user_profiles (auth_user_id, display_name, avatar_url, encryption_salt)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NULLIF(split_part(NEW.email, '@', 1), ''),
      'User'  -- 最終防線：避免匿名/手機登入時 display_name 為 NULL 阻斷註冊
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    encode(gen_random_bytes(16), 'hex')
  )
  RETURNING id INTO new_profile_id;

  -- 同步建立 free 方案 entitlement
  INSERT INTO public.entitlements (user_profile_id, plan)
  VALUES (new_profile_id, 'free')
  ON CONFLICT (user_profile_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 補建：對「本 migration 之前已存在但沒有 profile」的用戶補上 profile + entitlement
INSERT INTO public.user_profiles (auth_user_id, display_name, encryption_salt)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'name', NULLIF(split_part(u.email, '@', 1), ''), 'User'),
       encode(gen_random_bytes(16), 'hex')
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.auth_user_id = u.id
WHERE p.id IS NULL;

INSERT INTO public.entitlements (user_profile_id, plan)
SELECT p.id, 'free'
FROM public.user_profiles p
LEFT JOIN public.entitlements e ON e.user_profile_id = p.id
WHERE e.id IS NULL;

-- ─────────────────────────────────────────────────────────
-- 修復 2：household 建立時自動把 owner 加入 household_members
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_household()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.household_members (household_id, user_profile_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (household_id, user_profile_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_household_created ON households;
CREATE TRIGGER on_household_created
  AFTER INSERT ON households
  FOR EACH ROW EXECUTE FUNCTION handle_new_household();

-- 補建：對既有 household 補上 owner membership
INSERT INTO public.household_members (household_id, user_profile_id, role)
SELECT h.id, h.owner_id, 'owner'
FROM public.households h
LEFT JOIN public.household_members m
  ON m.household_id = h.id AND m.user_profile_id = h.owner_id
WHERE m.id IS NULL;

-- ─────────────────────────────────────────────────────────
-- 修復 3：companion_logs UPDATE 加 WITH CHECK，鎖死不可變欄位
-- ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "log_owner_update" ON companion_logs;
CREATE POLICY "log_owner_update" ON companion_logs FOR UPDATE
  USING (caregiver_id = auth_profile_id())
  WITH CHECK (
    caregiver_id = auth_profile_id()
    AND household_id IN (SELECT my_household_ids())
  );

-- ─────────────────────────────────────────────────────────
-- 修復 4：invite 建立限制角色（只有 owner / caregiver 可發邀請）
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION my_role_in(target_household UUID)
RETURNS TEXT AS $$
  SELECT role FROM household_members
  WHERE household_id = target_household AND user_profile_id = auth_profile_id()
  LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE;

DROP POLICY IF EXISTS "members_create_invite" ON household_invites;
CREATE POLICY "members_create_invite" ON household_invites FOR INSERT
  WITH CHECK (
    household_id IN (SELECT my_household_ids())
    AND created_by = auth_profile_id()
    AND my_role_in(household_id) IN ('owner', 'caregiver')
  );

-- ─────────────────────────────────────────────────────────
-- 修復 5：child_profiles 刪除允許 caregiver（與產品權限模型一致）
--   原 policy 只允許 owner，但產品定義 caregiver 也能管理孩子
-- ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "owner_delete_child" ON child_profiles;
CREATE POLICY "caregivers_delete_child" ON child_profiles FOR DELETE
  USING (
    household_id IN (SELECT my_household_ids())
    AND my_role_in(household_id) IN ('owner', 'caregiver')
  );

-- ─────────────────────────────────────────────────────────
-- 修復 6：Webhook 冪等性表（防止重複處理付款事件）
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS processed_webhooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      TEXT NOT NULL,                    -- 'lemonsqueezy' | 'revenuecat'
  event_id      TEXT NOT NULL,                    -- 供應商事件/訂單唯一 ID
  event_type    TEXT,
  processed_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, event_id)
);

ALTER TABLE processed_webhooks ENABLE ROW LEVEL SECURITY;
-- 僅 service-role（webhook）可存取；不開任何 anon/authenticated policy = 預設拒絕

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_lookup
  ON processed_webhooks(provider, event_id);

-- ─────────────────────────────────────────────────────────
-- 修復 7：缺漏的索引（webhook 與 entitlement 查詢）
-- ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_entitlements_lemon_sub
  ON entitlements(lemonsqueezy_subscription_id)
  WHERE lemonsqueezy_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entitlements_revenuecat
  ON entitlements(revenuecat_customer_id)
  WHERE revenuecat_customer_id IS NOT NULL;
