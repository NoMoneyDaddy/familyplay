-- Admin dashboard 即時指標：一次查詢回傳 JSON（含 group by / unnest）。
-- SECURITY DEFINER + 僅授權 service_role 執行（app 用 service role 呼叫，已先做管理員 email 把關）。
-- 不回傳任何個別孩子可識別資料（暱稱/生日），只有彙總數字與活動標題。

CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM user_profiles),
    'children', (SELECT count(*) FROM child_profiles),
    'households', (SELECT count(*) FROM households),
    'active_activities', (SELECT count(*) FROM companion_activities WHERE is_active),
    'total_activities', (SELECT count(*) FROM companion_activities),
    'logs_total', (SELECT count(*) FROM companion_logs),
    'logs_today', (SELECT count(*) FROM companion_logs
      WHERE created_at >= ((now() AT TIME ZONE 'Asia/Taipei')::date)::timestamp AT TIME ZONE 'Asia/Taipei'),
    'logs_7d', (SELECT count(*) FROM companion_logs WHERE created_at >= now() - interval '7 days'),
    'reminder_subs', (SELECT count(*) FROM push_subscriptions),
    'plans', (SELECT coalesce(jsonb_object_agg(plan, c), '{}'::jsonb)
      FROM (SELECT plan, count(*) c FROM entitlements GROUP BY plan) t),
    'activities_by_focus', (SELECT coalesce(jsonb_object_agg(f, c), '{}'::jsonb)
      FROM (SELECT f, count(*) c FROM companion_activities, unnest(developmental_focus) f
            WHERE is_active GROUP BY f) t),
    'recent_logs', (SELECT coalesce(jsonb_agg(r ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM (SELECT cl.created_at, coalesce(ca.title, '(未知活動)') AS title
            FROM companion_logs cl
            LEFT JOIN companion_activities ca ON ca.id = cl.activity_id
            ORDER BY cl.created_at DESC LIMIT 8) r)
  );
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_metrics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_metrics() TO service_role;
