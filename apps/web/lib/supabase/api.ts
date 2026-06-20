import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// API route 專用：建立帶 session（cookie）的 Supabase client，但 **不寫回 cookie**
// （setAll 為 no-op）——讀取型 API route 不負責刷新 session，行為與先前各 route
// 手刻的 inline client 完全一致。缺環境變數時回 null，由呼叫端回 500 misconfigured。
//
// 注意：需要寫回 cookie（登入/換 session）的 auth route 請改用 `server.ts` 的
// createClient()（setAll 會實際寫入），勿混用。
//
// 回傳型別刻意維持 createServerClient 的自然推斷（與各 route 先前 inline 寫法一致），
// 確保查詢結果型別不變、零行為差異。
export async function getApiSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  const cookieStore = await cookies()
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })
}
