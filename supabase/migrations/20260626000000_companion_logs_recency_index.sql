-- FamilyPlay — companion_logs 近期查詢複合索引 Migration
--
-- 背景：推薦引擎第 7 步「近 7 天降權」在最熱路徑（/api/recommendations）查詢
--   companion_logs WHERE child_id = ? AND created_at > (now - 7d)。
--   現有索引只有單欄 idx_companion_logs_child(child_id) 與
--   idx_companion_logs_started(started_at DESC)——都無法同時服務
--   「child_id 等值 + created_at 範圍」，隨紀錄量成長會退化成 child 範圍掃描。
--
-- 修復：新增 (child_id, created_at DESC) 複合索引，精準服務該查詢。
--
-- 注意：本檔只新增，不修改舊 migration。需手動套用：
--   複製本檔 SQL 到 Supabase Dashboard → SQL Editor 執行。

CREATE INDEX IF NOT EXISTS idx_companion_logs_child_created
  ON companion_logs(child_id, created_at DESC);
