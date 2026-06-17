-- Fix: 新增孩子時 "Failed to create household"（onboarding 全流程失敗）
--
-- 根因：整個 onboarding 是「成員制」RLS——
--   * households SELECT 政策只允許「成員」讀取
--   * child_profiles INSERT/SELECT 要求 household_id IN my_household_ids()（必須是成員）
-- 但建立 household 時並未把 owner 加入 household_members，導致：
--   1. owner 讀不回自己剛建立的 household（client 的 insert().select() 回讀失敗 → 42501）
--   2. my_household_ids() 為空 → 連新增孩子也被 RLS 擋下
--
-- 修法（純 DB，不動程式）：
--   1. households SELECT 政策額外允許 owner 讀自己的家庭（解 insert 後回讀，不依賴 timing）
--   2. 建立 household 時以 trigger 自動把 owner 加為成員（成員制 RLS 對 owner 生效）

-- 1) owner 可讀自己建立的 household
ALTER POLICY members_can_read_household ON public.households
  USING ((id IN (SELECT my_household_ids())) OR (owner_id = auth_profile_id()));

-- 2) 建立 household 時自動把 owner 加為成員
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.household_members (household_id, user_profile_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_household_created ON public.households;
CREATE TRIGGER on_household_created
  AFTER INSERT ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();
