-- FamilyPlay — 函式安全強化（回應 Supabase security advisor）
--
-- 1. 為所有 SECURITY DEFINER 函式固定 search_path（防止 search-path 劫持）
-- 2. 撤銷 anon / authenticated 透過 REST RPC 直接呼叫這些函式的權限
--    （App 只查表、RLS 自動套用；從不直接 RPC 這些函式，故撤銷安全）

-- ── 1. 固定 search_path ──────────────────────────────────
ALTER FUNCTION public.auth_profile_id() SET search_path = public;
ALTER FUNCTION public.my_household_ids() SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;

-- rls_auto_enable 可能不存在（視初始 schema 而定），用 DO 包起來容錯
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable') THEN
    EXECUTE 'ALTER FUNCTION public.rls_auto_enable() SET search_path = public';
  END IF;
END $$;

-- ── 2. 收緊 REST RPC 曝露 ────────────────────────────────
-- Postgres 預設把 EXECUTE 授予 PUBLIC，anon/authenticated 會繼承，故先全部從
-- PUBLIC 撤銷。
--
-- 重要區別：
--   • Trigger 函式（handle_new_*, rls_auto_enable）由 trigger 機制以 definer
--     身分執行，從不被呼叫端直接呼叫 → 完全撤銷，杜絕 RPC 曝露。
--   • RLS 輔助函式（auth_profile_id / my_household_ids / my_role_in）在 RLS
--     policy 評估時「以呼叫者身分」執行，因此 authenticated 必須保有 EXECUTE，
--     否則所有 RLS 查詢會 "permission denied for function" → App 全掛。
--     只 GRANT 給 authenticated（不給 anon），把曝露面降到最低。

-- Trigger 函式：完全撤銷
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_household() FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
  END IF;
END $$;

-- RLS 輔助函式：從 PUBLIC/anon 撤銷，但 authenticated 必須保留（RLS 需要）
REVOKE EXECUTE ON FUNCTION public.auth_profile_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_household_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_role_in(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_household_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_role_in(uuid) TO authenticated;
