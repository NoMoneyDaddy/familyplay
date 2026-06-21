-- 資安修補（Critical 越權）：移除過度寬鬆的 household_members 直接 INSERT 政策。
-- 原 join_own_household 只檢查 user_profile_id=自己，未限 household_id/role → 任何登入者
-- 可自插成員列、自封 owner，繞過 accept_household_invite，攻破家庭隔離。
-- 正當加入路徑皆 SECURITY DEFINER（繞過 RLS），不依賴此政策：
--   建立家庭 → on_household_created 觸發 add_owner_as_member()
--   受邀加入 → accept_household_invite(invite_code)
-- 故直接移除；移除後 client 端一律不能直接寫 household_members。
-- 已於 2026-06-21 透過工具套用至正式專案。
DROP POLICY IF EXISTS "join_own_household" ON public.household_members;
