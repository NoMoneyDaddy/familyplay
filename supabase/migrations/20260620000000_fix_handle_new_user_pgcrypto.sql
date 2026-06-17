-- Fix: 匿名 / Google 登入失敗 "Database error creating ... user"
--
-- 根因：先前的安全強化 migration 為 public.handle_new_user() 設了
-- `SET search_path TO 'public'`，但該函式呼叫的 gen_random_bytes() 來自
-- pgcrypto、位於 `extensions` schema。鎖死 search_path 後找不到該函式，
-- 導致 on_auth_user_created trigger 失敗，任何新使用者（含匿名、Google）
-- 都無法建立。
--
-- 修法：將呼叫改為 schema 限定的 extensions.gen_random_bytes()，
-- 同時保留 SECURITY DEFINER 與 search_path 強化（最小變更）。

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_profile_id UUID;
BEGIN
  INSERT INTO public.user_profiles (auth_user_id, display_name, avatar_url, encryption_salt)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NULLIF(split_part(NEW.email, '@', 1), ''),
      'User'
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    encode(extensions.gen_random_bytes(16), 'hex')
  )
  RETURNING id INTO new_profile_id;

  INSERT INTO public.entitlements (user_profile_id, plan)
  VALUES (new_profile_id, 'free')
  ON CONFLICT (user_profile_id) DO NOTHING;

  RETURN NEW;
END;
$function$;
