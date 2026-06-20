import type { SupabaseClient } from '@supabase/supabase-js'

// 共用：解析「目前登入者 → user_profiles.id」。此段邏輯原本在 saved / log / handoff /
// children / account 各自手刻一份（兩端漂移、錯誤語意不一）。集中於此一處。
//
// 設計：以 onError 工廠回各模組自己的錯誤型別，呼叫端不需改 catch（保留現有行為）；
// 內部用 maybeSingle 區分「查詢失敗(failed)」與「查無資料(not_found)」，讓需要的呼叫端
// 可分別對應 5xx / 4xx（不需要的就把兩者映到同一個錯誤即可）。

export type ProfileResolveKind = 'unauthorized' | 'not_found' | 'failed'

/**
 * 取目前登入者的 user_profile id。失敗時丟出 onError(kind) 回傳的錯誤：
 * - unauthorized：未登入
 * - failed：user_profiles 查詢失敗（RLS/網路/DB，屬系統錯誤 5xx）
 * - not_found：查無 profile（屬 4xx）
 */
export async function resolveProfileId(
  supabase: SupabaseClient,
  onError: (kind: ProfileResolveKind) => Error,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw onError('unauthorized')

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (error) throw onError('failed')
  if (!data) throw onError('not_found')
  return data.id as string
}
