-- 效能：推薦熱路徑（recommend.ts）依 is_active + 年齡範圍（min<=age AND max>=age）過濾。
-- 目前只有 idx_companion_activities_active(is_active) 部分索引；活動庫擴大後年齡過濾
-- 會退化成掃描已過濾集合。
--
-- 索引取捨：B-tree 對「雙不等式範圍查詢」只有第一欄能有效收斂掃描。故把較具選擇性的
-- max_age_months 放前面（對年幼孩子，max>=age 能濾掉更多高齡活動）。
-- 長期最佳解是 GiST + int4range（point-in-range，@> 運算子），但需同步改查詢語法；
-- 活動庫仍小（~166 筆），此處先用低成本的 B-tree 排序改善，留 GiST 為未來升級。
-- 只新增。需手動套用：複製到 Supabase Dashboard → SQL Editor 執行。
CREATE INDEX IF NOT EXISTS idx_companion_activities_active_age
  ON public.companion_activities (max_age_months, min_age_months)
  WHERE is_active = TRUE;
