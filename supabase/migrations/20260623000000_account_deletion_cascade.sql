-- 帳號刪除：讓「刪除 auth 使用者」能乾淨級聯清除其資料。
--
-- 指向 user_profiles 的這幾個 FK 原本沒有 ON DELETE 動作（RESTRICT），會擋住
-- 刪除流程（例如使用者擁有家庭、有陪伴紀錄、發過邀請）。改為：
--   * 擁有的家庭 / 自己的紀錄 / 自己發的邀請 / 自己的交接摘要 → CASCADE（一起刪）
--   * 自己「使用過」的邀請 used_by → SET NULL（保留該筆邀請紀錄，僅清掉關聯）
-- 之後 admin.deleteUser(authUserId) 會經 user_profiles(ON DELETE CASCADE) 一路清乾淨。

ALTER TABLE public.households
  DROP CONSTRAINT households_owner_id_fkey,
  ADD CONSTRAINT households_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.companion_logs
  DROP CONSTRAINT companion_logs_caregiver_id_fkey,
  ADD CONSTRAINT companion_logs_caregiver_id_fkey
    FOREIGN KEY (caregiver_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.household_invites
  DROP CONSTRAINT household_invites_created_by_fkey,
  ADD CONSTRAINT household_invites_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.household_invites
  DROP CONSTRAINT household_invites_used_by_fkey,
  ADD CONSTRAINT household_invites_used_by_fkey
    FOREIGN KEY (used_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.handoff_summaries
  DROP CONSTRAINT handoff_summaries_created_by_fkey,
  ADD CONSTRAINT handoff_summaries_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
