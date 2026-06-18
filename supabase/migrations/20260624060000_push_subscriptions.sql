-- 睡前陪伴提醒：Web Push 訂閱表。
-- 每個裝置一筆（endpoint 唯一）。送出提醒的排程工作用 service role 讀取，
-- 一般使用者只能管理自己的訂閱（RLS）。不存任何孩子可識別資料。

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_profile ON public.push_subscriptions (user_profile_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 使用者只能讀寫自己的訂閱
CREATE POLICY "own push subs select" ON public.push_subscriptions
  FOR SELECT USING (
    user_profile_id = (SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "own push subs insert" ON public.push_subscriptions
  FOR INSERT WITH CHECK (
    user_profile_id = (SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "own push subs delete" ON public.push_subscriptions
  FOR DELETE USING (
    user_profile_id = (SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid())
  );
