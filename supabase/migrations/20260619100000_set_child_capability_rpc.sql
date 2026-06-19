-- 原子性「標記單一里程碑能力」RPC。
--
-- 解決兩個問題：
--   1) 並發覆蓋：原本 API 用 read-modify-write 整包回寫 capabilities JSONB，快速勾選
--      多個不同能力時，後送達的請求會以舊資料覆蓋、靜默丟失先寫入的能力。改用
--      JSONB 合併（||）／刪除（-）運算子在 DB 端原子更新單一鍵。
--   2) 缺能力檔：兩段式建立孩子（先 child_profiles 再 child_capability_profiles）
--      若中斷，會留下「孩子存在但沒有能力檔」的資料，使里程碑無法儲存。這裡先以
--      ON CONFLICT DO NOTHING 補建空檔自我修復。
--
-- 安全：SECURITY INVOKER（預設）——INSERT/UPDATE 仍受 RLS
-- caregivers_write_capabilities 約束，只有能寫入該孩子家庭的照顧者會成功；
-- 非授權孩子的 UPDATE 會被 USING 過濾成 0 列、回傳 NULL，由 API 轉成 404。

CREATE OR REPLACE FUNCTION public.set_child_capability(
  p_child_id UUID,
  p_key TEXT,
  p_achieved BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_caps JSONB;
BEGIN
  -- 缺檔自我修復（RLS WITH CHECK 會擋掉非授權孩子的插入）
  INSERT INTO public.child_capability_profiles (child_id, capabilities)
  VALUES (p_child_id, '{}'::jsonb)
  ON CONFLICT (child_id) DO NOTHING;

  IF p_achieved THEN
    UPDATE public.child_capability_profiles
       SET capabilities = COALESCE(capabilities, '{}'::jsonb) || jsonb_build_object(p_key, true),
           last_updated = NOW()
     WHERE child_id = p_child_id
     RETURNING capabilities INTO v_caps;
  ELSE
    UPDATE public.child_capability_profiles
       SET capabilities = COALESCE(capabilities, '{}'::jsonb) - p_key,
           last_updated = NOW()
     WHERE child_id = p_child_id
     RETURNING capabilities INTO v_caps;
  END IF;

  RETURN v_caps; -- 非授權（RLS 擋下 UPDATE）→ 0 列 → NULL
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_child_capability(UUID, TEXT, BOOLEAN) TO authenticated;
