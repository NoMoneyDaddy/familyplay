import type { SupabaseClient } from '@supabase/supabase-js'

// 行動端記錄一筆陪伴：與 Web /api/log 同流程，直接用行動端 Supabase client
// （帶 session → RLS 生效）。閉環關鍵：記錄後餵推薦引擎「近 7 天降權」與歷史頁。

export type Outcome = 'completed' | 'tried' | 'abandoned'
export type ChildReaction = 'happy' | 'engaged' | 'neutral' | 'leaving' | 'disinterested' | 'calmed'

export class LogError extends Error {}

/**
 * 寫入一筆 companion_logs。household_id / caregiver_id 由 childId 與當前使用者推出，
 * 不信任前端傳入，避免跨戶誤記。失敗丟 LogError，畫面負責顯示。
 */
export async function logCompanion(
  supabase: SupabaseClient,
  params: {
    childId: string
    activityId: string
    outcome: Outcome
    childReaction: ChildReaction
    durationSecs?: number
  },
): Promise<void> {
  const { childId, activityId, outcome, childReaction, durationSecs } = params

  // 取 household_id（RLS：非本戶查不到 → 視為無權限）
  const { data: child, error: childError } = await supabase
    .from('child_profiles')
    .select('household_id')
    .eq('id', childId)
    .single()
  if (childError || !child?.household_id) {
    throw new LogError('找不到孩子資料')
  }

  // 取當前使用者的 profile id 作為 caregiver
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new LogError('尚未登入')
  }
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (profileError || !profile) {
    throw new LogError('找不到使用者資料')
  }

  const { error: insertError } = await supabase.from('companion_logs').insert({
    child_id: childId,
    household_id: child.household_id,
    activity_id: activityId,
    caregiver_id: profile.id,
    outcome,
    child_reaction: childReaction,
    duration_secs: durationSecs,
  })
  if (insertError) {
    throw new LogError('記錄失敗，請稍後再試')
  }
}
