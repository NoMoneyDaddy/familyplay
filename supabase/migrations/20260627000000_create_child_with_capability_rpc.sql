-- FamilyPlay — 原子化建立孩子 + 能力檔 RPC Migration
--
-- 背景：/api/children 先 insert child_profiles 再 insert child_capability_profiles，
--   兩步非交易。能力檔是 ZPD 推薦的前提；若第二步失敗只能在應用層「手動刪孩子回滾」，
--   且兩步之間若程序中斷會留下無能力檔的孩子（推薦靜默降級）。
--
-- 修法：以單一 SECURITY DEFINER 函式在同一交易內完成兩個 insert，任一失敗整筆回滾。
--   SECURITY DEFINER 會繞過 RLS，故函式內自行驗證呼叫者確實屬於該家庭（owner 或 member），
--   不放寬任何權限。僅授權 authenticated 呼叫。
--
-- 注意：本檔只新增。需手動套用：複製 SQL 到 Supabase Dashboard → SQL Editor 執行。

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
  v_profile_id := auth_profile_id();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  -- 防禦：SECURITY DEFINER 繞過 RLS，必須自行確認呼叫者屬於該家庭，
  -- 否則任何登入者都能往別人家庭塞孩子。
  IF NOT EXISTS (
    SELECT 1 FROM public.households
      WHERE id = p_household_id AND owner_id = v_profile_id
    UNION
    SELECT 1 FROM public.household_members
      WHERE household_id = p_household_id AND user_profile_id = v_profile_id
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
