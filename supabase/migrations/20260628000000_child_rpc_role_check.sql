-- FamilyPlay — create_child_with_capability 補角色檢查 Migration
--
-- 背景：上一版 RPC 僅檢查呼叫者「是否為家庭成員」，未濾角色。household_members.role
--   含唯讀的 'viewer'；RLS 對直接 insert 由 caregivers_create_child 政策限 owner/caregiver，
--   但本 RPC 是 SECURITY DEFINER 會繞過 RLS → viewer 也能透過 RPC 建立孩子（權限提升）。
--
-- 修法：成員檢查加 role IN ('owner','caregiver')，與 RLS 寫入政策一致。
--   owner 仍以 households.owner_id 認定（不依賴 household_members 是否有 owner 列）。
--
-- 注意：本檔只新增（以 CREATE OR REPLACE 覆寫函式定義）。需手動套用：
--   複製 SQL 到 Supabase Dashboard → SQL Editor 執行。

CREATE OR REPLACE FUNCTION public.create_child_with_capability(
  p_household_id     uuid,
  p_nickname         text,
  p_birth_year_month text,
  p_stage_key        text
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_child_id   uuid;
BEGIN
  SELECT id INTO v_profile_id
    FROM public.user_profiles
    WHERE auth_user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  -- 防禦：SECURITY DEFINER 繞過 RLS，必須自行驗權。寫入限 owner 或 caregiver，
  -- viewer（唯讀成員）不得建立孩子——與 caregivers_create_child 政策一致。
  IF NOT EXISTS (
    SELECT 1 FROM public.households
      WHERE id = p_household_id AND owner_id = v_profile_id
    UNION ALL
    SELECT 1 FROM public.household_members
      WHERE household_id = p_household_id
        AND user_profile_id = v_profile_id
        AND role IN ('owner', 'caregiver')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.child_profiles (household_id, nickname, birth_year_month, stage_key)
  VALUES (p_household_id, p_nickname, p_birth_year_month, p_stage_key)
  RETURNING id INTO v_child_id;

  INSERT INTO public.child_capability_profiles (child_id, capabilities)
  VALUES (v_child_id, '{}'::jsonb);

  RETURN v_child_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_child_with_capability(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_child_with_capability(uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_child_with_capability(uuid, text, text, text) TO authenticated;
