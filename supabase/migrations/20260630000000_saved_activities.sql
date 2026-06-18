-- FamilyPlay — 我的收藏（save for later）Migration
--
-- 背景：家長找到喜歡的活動後，想之後 2 下就能再找到，而不必重跑整個狀態選擇流程。
--   收藏屬「個人書架」（綁 user_profile，非 household），與 companion_logs 一樣走 RLS。
--
-- 注意：本檔只新增。需手動套用：複製 SQL 到 Supabase Dashboard → SQL Editor 執行。

CREATE TABLE IF NOT EXISTS saved_activities (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id  uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  activity_id      uuid NOT NULL REFERENCES companion_activities(id) ON DELETE CASCADE,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (user_profile_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_activities_user
  ON saved_activities(user_profile_id, created_at DESC);

ALTER TABLE saved_activities ENABLE ROW LEVEL SECURITY;

-- 僅本人可讀/寫自己的收藏
CREATE POLICY "own_saved_select" ON saved_activities FOR SELECT
  USING (user_profile_id = auth_profile_id());
CREATE POLICY "own_saved_insert" ON saved_activities FOR INSERT
  WITH CHECK (user_profile_id = auth_profile_id());
CREATE POLICY "own_saved_delete" ON saved_activities FOR DELETE
  USING (user_profile_id = auth_profile_id());
