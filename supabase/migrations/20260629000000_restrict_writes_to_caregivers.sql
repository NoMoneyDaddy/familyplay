-- FamilyPlay — 修補 viewer 越權寫入（RLS 寫入政策補角色）Migration
--
-- 背景（critical 越權 / Privilege Escalation）：
--   寫入型 RLS 政策都用 my_household_ids()，而該函式只看「是否為成員」不濾角色。
--   household_members.role 含唯讀的 'viewer'（邀請可指派 viewer），因此 viewer 能
--   直接走 REST API 對下列資料寫入/修改，繞過「唯讀」語意：
--     child_profiles(INSERT/UPDATE)、child_capability_profiles(ALL)、
--     companion_logs(INSERT)、household_invites(INSERT)、handoff_summaries(INSERT)。
--   （#73 只堵了 create_child RPC 路徑；本檔堵直接寫入路徑。）
--
-- 修法：新增 my_writeable_household_ids()（role IN owner/caregiver；owner 因建立時
--   觸發器已以 role='owner' 加入 household_members，故含在內），並把所有寫入政策改用它。
--   讀取政策維持 my_household_ids() 不變——viewer 仍可檢視共用資料，只是不能寫。
--
-- 注意：本檔只新增。需手動套用：複製 SQL 到 Supabase Dashboard → SQL Editor 執行。

-- 寫入授權專用：僅 owner / caregiver
CREATE OR REPLACE FUNCTION my_writeable_household_ids()
RETURNS SETOF UUID AS $$
  SELECT household_id
  FROM public.household_members
  WHERE user_profile_id = auth_profile_id()
    AND role IN ('owner', 'caregiver')
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.my_writeable_household_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_writeable_household_ids() TO authenticated;

-- ── child_profiles：建立／修改限 caregiver/owner ──
DROP POLICY IF EXISTS "caregivers_create_child" ON child_profiles;
CREATE POLICY "caregivers_create_child" ON child_profiles FOR INSERT
  WITH CHECK (household_id IN (SELECT my_writeable_household_ids()));

DROP POLICY IF EXISTS "caregivers_update_child" ON child_profiles;
CREATE POLICY "caregivers_update_child" ON child_profiles FOR UPDATE
  USING (household_id IN (SELECT my_writeable_household_ids()))
  WITH CHECK (household_id IN (SELECT my_writeable_household_ids()));

-- ── child_capability_profiles：原 FOR ALL 拆成「成員可讀 / caregiver 可寫」 ──
DROP POLICY IF EXISTS "members_manage_capabilities" ON child_capability_profiles;
CREATE POLICY "members_read_capabilities" ON child_capability_profiles FOR SELECT
  USING (child_id IN (SELECT id FROM child_profiles WHERE household_id IN (SELECT my_household_ids())));
CREATE POLICY "caregivers_write_capabilities" ON child_capability_profiles FOR ALL
  USING (child_id IN (SELECT id FROM child_profiles WHERE household_id IN (SELECT my_writeable_household_ids())))
  WITH CHECK (child_id IN (SELECT id FROM child_profiles WHERE household_id IN (SELECT my_writeable_household_ids())));

-- ── companion_logs：寫入限 caregiver/owner（仍要求 caregiver_id = 自己）──
DROP POLICY IF EXISTS "caregivers_write_log" ON companion_logs;
CREATE POLICY "caregivers_write_log" ON companion_logs FOR INSERT
  WITH CHECK (household_id IN (SELECT my_writeable_household_ids()) AND caregiver_id = auth_profile_id());

-- ── household_invites：發邀請限 caregiver/owner（仍要求 created_by = 自己）──
DROP POLICY IF EXISTS "members_create_invite" ON household_invites;
CREATE POLICY "members_create_invite" ON household_invites FOR INSERT
  WITH CHECK (household_id IN (SELECT my_writeable_household_ids()) AND created_by = auth_profile_id());

-- ── handoff_summaries：建立交接限 caregiver/owner（仍要求 created_by = 自己）──
DROP POLICY IF EXISTS "members_create_handoffs" ON handoff_summaries;
CREATE POLICY "members_create_handoffs" ON handoff_summaries FOR INSERT
  WITH CHECK (household_id IN (SELECT my_writeable_household_ids()) AND created_by = auth_profile_id());
