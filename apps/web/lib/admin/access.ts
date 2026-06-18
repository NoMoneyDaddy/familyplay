import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 管理員把關：只有登入且 email 在 ADMIN_EMAILS 白名單內的人能看 dashboard。
// ADMIN_EMAILS 未設定 → 沒有任何管理員（頁面一律 404），避免不小心公開營運數據。
export async function getAdminEmail(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  const allow = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (allow.length === 0) return null

  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase()
  if (!email || !allow.includes(email)) return null
  return email
}
