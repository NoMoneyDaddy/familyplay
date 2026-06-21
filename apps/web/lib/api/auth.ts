import type { SupabaseClient, User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getRequestId } from '@/lib/request-id'
import { getApiSupabase } from '@/lib/supabase/api'

// API route 認證樣板的單一來源：建立帶 session 的 Supabase client → 取得登入使用者。
// 各 route 先前重複「getApiSupabase() → 缺 env 回 500 → getUser() → 未登入回 401」約 10 行，
// 收斂到此處，行為（狀態碼、錯誤訊息形狀）與先前完全一致。
//
// 用法：
//   const auth = await requireAuth(request)
//   if (auth instanceof NextResponse) return auth
//   const { supabase, user, requestId } = auth
//
// 回傳 NextResponse → 呼叫端直接 return（500 misconfigured / 401 Unauthorized）。
// 成功 → { supabase, user, requestId }，requestId 一律帶上供上報。
//
// 注意：需 service-role client、或在大 try 內自行處理 auth 錯誤上報的 route（如 /api/log、
// ai.*、push.* service-role 路徑）維持原樣，不強套此 helper。

export interface AuthContext {
  supabase: SupabaseClient
  user: User
  requestId: string
}

export async function requireAuth(request: Request): Promise<AuthContext | NextResponse> {
  const requestId = getRequestId(request)

  const supabase = await getApiSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return { supabase, user, requestId }
}
