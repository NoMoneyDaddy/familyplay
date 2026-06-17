import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from './config'

type CookieToSet = { name: string; value: string; options?: CookieOptions }

/**
 * 伺服器端 Supabase client（使用者 session，RLS 生效）。
 * 未設定環境變數時回傳 null，呼叫端應據此降級。
 */
export async function createClient() {
  const env = getSupabaseEnv()
  if (!env) return null

  const cookieStore = await cookies()

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: CookieToSet[]) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // 在 Server Component 中呼叫 set 會丟錯；有 middleware 負責刷新 session，可忽略。
        }
      },
    },
  })
}
