-- FamilyPlay — companion_logs 刪除權限 Migration
--
-- 背景：陪伴紀錄頁要支援「直接編輯／刪除紀錄」。
--   UPDATE 已有 policy（log_owner_update，僅限建立者），但 DELETE 從未開放
--   → 無 DELETE policy 時 RLS 一律拒絕，使用者無法刪掉自己誤記的紀錄。
--
-- 修復：新增 DELETE policy，僅允許「該紀錄的建立者（caregiver）」刪除自己的紀錄。
--   與 log_owner_update 一致的擁有權模型；不開放刪除別人記的紀錄。
--
-- 注意：本檔只新增，不修改舊 migration。

DROP POLICY IF EXISTS "log_owner_delete" ON companion_logs;
CREATE POLICY "log_owner_delete" ON companion_logs FOR DELETE
  USING (caregiver_id = auth_profile_id());
