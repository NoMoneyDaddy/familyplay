-- FamilyPlay — 收緊 AI 配額 / 里程碑 RPC 的 EXECUTE 權限
--
-- 背景：Supabase 對 public schema 設有 ALTER DEFAULT PRIVILEGES，會自動把新建函式的
--   EXECUTE 授予 anon / authenticated / service_role。這使得 20260703 migration 內的
--   `REVOKE ALL ... FROM PUBLIC` 無法擋住這些「明確角色」授權——驗證後發現
--   refund_plus_ai_call 實際仍可被 authenticated 直接呼叫，等於任何登入者能在瀏覽器
--   連打把自己的配額刷到上限，正是該函式註解警告的越權刷額漏洞。
--
-- 修正：顯式對指定角色 REVOKE EXECUTE。
--   - refund_plus_ai_call：只留 service_role（後端 service-role key 呼叫），撤回 anon/authenticated
--   - consume_plus_ai_call：僅供登入者，撤回 anon（防禦性；anon 的 auth.uid() 為 null 本就拿不到 profile）
--   - set_child_capability：僅供登入者（SECURITY INVOKER + RLS 把關），撤回 anon
--
-- 注意：本檔只新增。需手動套用：複製 SQL 到 Supabase Dashboard → SQL Editor 執行。

REVOKE EXECUTE ON FUNCTION public.refund_plus_ai_call(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_plus_ai_call() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_child_capability(uuid, text, boolean) FROM anon;
