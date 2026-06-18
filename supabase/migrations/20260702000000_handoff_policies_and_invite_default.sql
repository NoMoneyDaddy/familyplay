-- FamilyPlay — handoff_summaries 編輯/刪除政策 + 修正 invite token 預設 Migration
--
-- 背景（審查 #20 資料完整性）：
--   1. handoff_summaries 只有 SELECT + INSERT 政策；RLS 開啟下使用者永遠無法
--      編輯/刪除自己建立的交接（與 companion_logs 在 20260625 修過的缺口同型）。
--   2. household_invites.token 的欄位預設是 encode(gen_random_bytes(32),'hex')，
--      產生 64 碼小寫 hex；但 accept_household_invite 以 upper() 比對。App 一律自帶
--      8 碼大寫 token，故預設值不會被用到；但若有人不帶 token 直接 insert，產生的
--      列因大小寫不符而永遠無法被接受。移除預設，避免此 footgun（NOT NULL 仍要求帶值）。
--
-- 注意：本檔只新增。需手動套用：複製 SQL 到 Supabase Dashboard → SQL Editor 執行。

-- 建立者可編輯／刪除自己的交接（與 companion_logs 的 log_owner_* 一致）
CREATE POLICY "handoff_owner_update" ON handoff_summaries FOR UPDATE
  USING (created_by = auth_profile_id());
CREATE POLICY "handoff_owner_delete" ON handoff_summaries FOR DELETE
  USING (created_by = auth_profile_id());

-- 移除會產生「永遠無法接受」邀請列的欄位預設；插入必須自帶 token（App 已如此）
ALTER TABLE household_invites ALTER COLUMN token DROP DEFAULT;
