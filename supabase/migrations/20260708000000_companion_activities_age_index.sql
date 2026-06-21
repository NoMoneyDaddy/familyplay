-- 效能：推薦熱路徑（recommend.ts）依 is_active + 年齡範圍過濾活動。
-- 目前只有 idx_companion_activities_active(is_active) 部分索引；活動庫擴大後年齡過濾
-- 會退化成掃描已過濾集合。加複合索引涵蓋年齡範圍，未來防呆。
-- 只新增。需手動套用：複製到 Supabase Dashboard → SQL Editor 執行。
CREATE INDEX IF NOT EXISTS idx_companion_activities_active_age
  ON public.companion_activities (min_age_months, max_age_months)
  WHERE is_active = TRUE;
