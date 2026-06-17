-- Fix: 邀請接受在 RLS 下完全失效（次要成員無法加入家庭共同查看孩子資料）
--
-- 根因：household_invites 的 SELECT 政策 members_read_invites 只允許「已是成員」
-- 依 my_household_ids() 讀取邀請；但受邀者依定義「還不是成員」，因此：
--   1. 受邀者用自己的 client 依 token 查邀請 → 被 RLS 擋下回 null →「邀請碼無效」
--   2. household_invites 沒有任何 UPDATE 政策 → 標記 used_at 也被 RLS 擋下
-- 兩者疊加導致「發邀請碼給次要成員共同查看」功能完全無法運作。
--
-- 修法：以 SECURITY DEFINER 函式原子化完成「查驗邀請 → 加入成員 → 標記已用」，
-- 僅授權給 authenticated 角色呼叫。函式內仍嚴格驗證（過期 / 已用 / 重複加入），
-- 完全不放寬任何 RLS 政策——邀請內容不會外洩，受邀者也只能透過正確的 token 加入。

CREATE OR REPLACE FUNCTION public.accept_household_invite(invite_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_invite     public.household_invites%ROWTYPE;
BEGIN
  -- 必須是登入使用者（auth_profile_id 取當前使用者的 user_profiles.id）
  v_profile_id := auth_profile_id();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  -- token 為 8 碼大寫英數，正規化後比對
  SELECT * INTO v_invite
    FROM public.household_invites
    WHERE token = upper(btrim(invite_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_code' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_invite.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'already_used' USING ERRCODE = 'raise_exception';
  END IF;
  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'expired' USING ERRCODE = 'raise_exception';
  END IF;

  -- 加入成員（冪等：重複接受不報錯）
  INSERT INTO public.household_members (household_id, user_profile_id, role)
  VALUES (v_invite.household_id, v_profile_id, v_invite.role)
  ON CONFLICT (household_id, user_profile_id) DO NOTHING;

  -- 標記邀請已用（一次性）
  UPDATE public.household_invites
     SET used_at = now(), used_by = v_profile_id
   WHERE id = v_invite.id;

  RETURN v_invite.household_id;
END;
$function$;

-- 僅 authenticated 可呼叫（anon / public 不可）
REVOKE ALL ON FUNCTION public.accept_household_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_household_invite(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_household_invite(text) TO authenticated;
