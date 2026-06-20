import type { SupabaseClient } from '@supabase/supabase-js'

// 跨平台共用：記錄一筆陪伴。household_id / caregiver_id 由 childId 與當前使用者推出，
// 不信任前端傳入，避免跨戶誤記。

export type Outcome = 'completed' | 'tried' | 'abandoned'
export type ChildReaction = 'happy' | 'engaged' | 'neutral' | 'leaving' | 'disinterested' | 'calmed'

export class LogError extends Error {}

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

  const { data: child, error: childError } = await supabase
    .from('child_profiles')
    .select('household_id')
    .eq('id', childId)
    .single()
  if (childError || !child?.household_id) {
    throw new LogError('找不到孩子資料')
  }

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
