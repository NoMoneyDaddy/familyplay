import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { getSupabaseEnv } from './config'

type CookieToSet = { name: string; value: string; options?: CookieOptions }

/**
 * 在每個請求刷新 Supabase session（@supabase/ssr 建議的中介層模式）。
 * 未設定環境變數或發生錯誤時直接放行，確保網站在沒有 Supabase 時仍可運作。
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  const env = getSupabaseEnv()
  if (!env) return response

  try {
    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: CookieToSet[]) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    })

    // 觸發 token 刷新（必要：勿在 createServerClient 與 getUser 之間插入其他邏輯）
    await supabase.auth.getUser()
  } catch {
    // 任何錯誤都放行，不阻斷請求
  }

  return response
}
