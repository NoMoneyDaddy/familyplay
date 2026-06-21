import type { ChildReaction } from '@familyplay/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { type ProfileResolveKind, resolveProfileId } from './profile'

// 跨平台共用：記錄一筆陪伴。household_id / caregiver_id 由 childId 與當前使用者推出，
// 不信任前端傳入，避免跨戶誤記。

export type Outcome = 'completed' | 'tried' | 'abandoned'
// ChildReaction 單一真實來源在 @familyplay/core；此處 re-export 維持既有引用路徑。
export type { ChildReaction }

export class LogError extends Error {}

// 行為保留：未登入 → '尚未登入'；查詢失敗或查無 → '找不到使用者資料'。
const logProfileError = (kind: ProfileResolveKind) =>
  new LogError(kind === 'unauthorized' ? '尚未登入' : '找不到使用者資料')

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

  const profileId = await resolveProfileId(supabase, logProfileError)

  const { error: insertError } = await supabase.from('companion_logs').insert({
    child_id: childId,
    household_id: child.household_id,
    activity_id: activityId,
    caregiver_id: profileId,
    outcome,
    child_reaction: childReaction,
    duration_secs: durationSecs,
  })
  if (insertError) {
    throw new LogError('記錄失敗，請稍後再試')
  }
}
