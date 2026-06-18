-- FamilyPlay — 修補 entitlements 自助升級漏洞（P0 越權 / 營收繞過）Migration
--
-- 背景（critical）：原政策
--   CREATE POLICY "own_entitlement" ON entitlements FOR ALL USING (user_profile_id = auth_profile_id());
--   FOR ALL 涵蓋 UPDATE，且沒有獨立 WITH CHECK → USING 同時當寫入檢查。
--   App 以 RLS 綁定的 anon client 讀 entitlements，因此同一把 anon key + 使用者 JWT
--   可直接對公開 PostgREST 端點下：
--     UPDATE entitlements SET plan='plus', plus_ai_calls_remaining=999 WHERE user_profile_id=<自己>
--   任何登入者都能把自己升級成付費方案 → 營收/權限繞過。
--
-- 修法：移除 FOR ALL。改為
--   • SELECT：可讀自己的方案
--   • INSERT：只允許插入 plan='free' 的預設列（保留 create-checkout 的保險路徑），
--     禁止自行插入付費方案
--   • 不提供 UPDATE/DELETE 政策 → 方案變更只能由 service-role webhook 寫入（繞過 RLS）
--
-- 注意：本檔只新增。需手動套用：複製 SQL 到 Supabase Dashboard → SQL Editor 執行。

DROP POLICY IF EXISTS "own_entitlement" ON entitlements;

CREATE POLICY "own_entitlement_read" ON entitlements FOR SELECT
  USING (user_profile_id = auth_profile_id());

CREATE POLICY "own_entitlement_insert_free" ON entitlements FOR INSERT
  WITH CHECK (user_profile_id = auth_profile_id() AND plan = 'free');
