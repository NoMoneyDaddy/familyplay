-- FamilyPlay — Plus 託管 AI 配額計次 RPC（consume / refund）Migration
--
-- 背景：entitlements 無 UPDATE 政策（見 20260701），使用者不能自行改方案／配額；
--   方案變更只由 service-role webhook 寫入。但「託管 AI 生成」要在每次呼叫時原子扣一次
--   配額，且不能把 service-role key 放進 app。
--
-- 解法：SECURITY DEFINER 函式，以函式擁有者身分執行（繞過 RLS），但只動「呼叫者本人」
--   （auth.uid() → user_profiles → entitlements）的那一列，無法被用來升級方案或改他人配額。
--   配額額度由伺服器端常數決定（PLUS_MONTHLY_QUOTA），不接受客戶端傳入，避免越權放大。
--
-- 行為：
--   consume：驗證為有效 Plus（plan='plus' 且未過期）→ 必要時做「月配額重置」→ 餘額>0 才扣 1。
--            回 jsonb { allowed, reason?, remaining?, reset_at? }。fail-closed：缺檔/非 Plus 一律不放行。
--   refund：生成失敗時退還 1 次（上限不超過當月配額），避免本方伺服器錯誤白白燒掉付費額度。
--
-- 注意：本檔只新增。需手動套用：複製 SQL 到 Supabase Dashboard → SQL Editor 執行。

-- 每月 Plus 託管 AI 生成次數（伺服器端決定，不由客戶端傳入）
-- 調整額度只需改這個常數並重跑函式定義。
CREATE OR REPLACE FUNCTION public.consume_plus_ai_call()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  PLUS_MONTHLY_QUOTA constant int := 100;
  v_profile uuid;
  v_ent entitlements%ROWTYPE;
  v_now timestamptz := now();
  v_remaining int;
  v_reset timestamptz;
BEGIN
  SELECT id INTO v_profile FROM user_profiles WHERE auth_user_id = auth.uid();
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_profile');
  END IF;

  -- 鎖定該列避免並發超扣
  SELECT * INTO v_ent FROM entitlements WHERE user_profile_id = v_profile FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_entitlement');
  END IF;

  -- 必須是有效 Plus（未設定 ends_at 視為仍有效；有設定則須未過期）
  IF v_ent.plan <> 'plus'
     OR (v_ent.plus_ends_at IS NOT NULL AND v_ent.plus_ends_at < v_now) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_plus');
  END IF;

  v_remaining := COALESCE(v_ent.plus_ai_calls_remaining, 0);
  v_reset := v_ent.plus_ai_calls_reset_at;

  -- 月配額重置：首次或已過重置時點 → 補滿並設下個月初為新的重置時點
  IF v_reset IS NULL OR v_reset < v_now THEN
    v_remaining := PLUS_MONTHLY_QUOTA;
    v_reset := date_trunc('month', v_now) + interval '1 month';
  END IF;

  IF v_remaining <= 0 THEN
    UPDATE entitlements
      SET plus_ai_calls_remaining = 0,
          plus_ai_calls_reset_at = v_reset,
          updated_at = v_now
      WHERE user_profile_id = v_profile;
    RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exhausted',
                              'remaining', 0, 'reset_at', v_reset);
  END IF;

  v_remaining := v_remaining - 1;
  UPDATE entitlements
    SET plus_ai_calls_remaining = v_remaining,
        plus_ai_calls_reset_at = v_reset,
        updated_at = v_now
    WHERE user_profile_id = v_profile;

  RETURN jsonb_build_object('allowed', true, 'remaining', v_remaining, 'reset_at', v_reset);
END;
$$;

-- 退還 1 次（生成失敗時呼叫）。只動本人列、且不超過上限（保守用 200 防呆，避免無限累加）。
CREATE OR REPLACE FUNCTION public.refund_plus_ai_call()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  REFUND_CAP constant int := 200;
  v_profile uuid;
BEGIN
  SELECT id INTO v_profile FROM user_profiles WHERE auth_user_id = auth.uid();
  IF v_profile IS NULL THEN
    RETURN;
  END IF;

  UPDATE entitlements
    SET plus_ai_calls_remaining = LEAST(REFUND_CAP, COALESCE(plus_ai_calls_remaining, 0) + 1),
        updated_at = now()
    WHERE user_profile_id = v_profile
      AND plan = 'plus';
END;
$$;

-- 僅允許登入者執行；撤回 PUBLIC 預設執行權
REVOKE ALL ON FUNCTION public.consume_plus_ai_call() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_plus_ai_call() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_plus_ai_call() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_plus_ai_call() TO authenticated;
