-- 成長紀錄（身高/體重/頭圍）。時間序列，每次量測一列，可追蹤成長曲線。
-- 只新增。需手動套用：複製 SQL 到 Supabase Dashboard → SQL Editor 執行。
--
-- RLS 與其他孩子資料一致：家庭成員可讀（my_household_ids），caregiver/owner 可寫
-- （my_writeable_household_ids，viewer 唯讀）。child 刪除時 cascade。

CREATE TABLE IF NOT EXISTS public.child_growth_measurements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  measured_on  DATE NOT NULL DEFAULT CURRENT_DATE,
  height_cm    NUMERIC(5,2),
  weight_kg    NUMERIC(5,2),
  head_circ_cm NUMERIC(5,2),
  created_by   UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 至少要有一個量測值（避免空白列）
  CONSTRAINT growth_has_value CHECK (
    height_cm IS NOT NULL OR weight_kg IS NOT NULL OR head_circ_cm IS NOT NULL
  ),
  -- 合理範圍（0–5 歲；擋明顯異常/注入值）
  CONSTRAINT growth_height_range CHECK (height_cm IS NULL OR (height_cm > 0 AND height_cm < 200)),
  CONSTRAINT growth_weight_range CHECK (weight_kg IS NULL OR (weight_kg > 0 AND weight_kg < 100)),
  CONSTRAINT growth_head_range   CHECK (head_circ_cm IS NULL OR (head_circ_cm > 0 AND head_circ_cm < 100))
);

CREATE INDEX IF NOT EXISTS idx_growth_child
  ON public.child_growth_measurements(child_id, measured_on DESC);

ALTER TABLE public.child_growth_measurements ENABLE ROW LEVEL SECURITY;

-- 成員可讀（含 viewer）
CREATE POLICY "members_read_growth" ON public.child_growth_measurements FOR SELECT
  USING (child_id IN (SELECT id FROM public.child_profiles WHERE household_id IN (SELECT my_household_ids())));

-- caregiver/owner 可寫（viewer 唯讀）
CREATE POLICY "caregivers_write_growth" ON public.child_growth_measurements FOR ALL
  USING (child_id IN (SELECT id FROM public.child_profiles WHERE household_id IN (SELECT my_writeable_household_ids())))
  WITH CHECK (child_id IN (SELECT id FROM public.child_profiles WHERE household_id IN (SELECT my_writeable_household_ids())));
