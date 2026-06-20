import type { SupabaseClient } from '@supabase/supabase-js'
import { type ProfileResolveKind, resolveProfileId } from './profile'

// 收藏（save for later）：綁 user_profile，RLS 僅本人可讀寫，UNIQUE(user_profile_id, activity_id)。
// 跨平台共用：Web 與行動端各自帶 session 的 client。

export class SavedError extends Error {}

export interface SavedEntry {
  activityId: string
  title: string
  minDurationMinutes: number | null
  maxDurationMinutes: number | null
  stimulationLevel: string | null
  developmentalFocus: string[]
  createdAt: string | null
}

// companion_activities 關聯在 supabase-js 可能回物件或陣列。
interface ActivityObj {
  id?: string
  title?: string
  min_duration_minutes?: number | null
  max_duration_minutes?: number | null
  stimulation_level?: string | null
  developmental_focus?: string[] | null
}
type ActivityJoin = ActivityObj | ActivityObj[] | null | undefined

export interface SavedRow {
  activity_id: string
  created_at: string | null
  companion_activities: ActivityJoin
}

/** DB 列 → SavedEntry（處理關聯物件/陣列兩種形狀）。抽出以便單元測試。 */
export function mapSavedRow(row: SavedRow): SavedEntry {
  const join = row.companion_activities
  const a = (Array.isArray(join) ? join[0] : join) ?? {}
  return {
    activityId: row.activity_id,
    title: a.title || '活動',
    minDurationMinutes: a.min_duration_minutes ?? null,
    maxDurationMinutes: a.max_duration_minutes ?? null,
    stimulationLevel: a.stimulation_level ?? null,
    developmentalFocus: a.developmental_focus || [],
    createdAt: row.created_at,
  }
}

const SAVED_SELECT =
  'activity_id, created_at, companion_activities(id, title, min_duration_minutes, max_duration_minutes, stimulation_level, developmental_focus)'

/** 列出收藏（含活動內容），新到舊。 */
export async function fetchSaved(supabase: SupabaseClient): Promise<SavedEntry[]> {
  const { data, error } = await supabase
    .from('saved_activities')
    .select(SAVED_SELECT)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new SavedError('無法載入收藏')
  return ((data || []) as SavedRow[]).map(mapSavedRow)
}

/** 取得目前已收藏的 activity id 集合（給卡片切換收藏狀態用）。 */
export async function fetchSavedIds(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase.from('saved_activities').select('activity_id').limit(500)
  if (error) throw new SavedError('無法載入收藏')
  return new Set(
    ((data || []) as { activity_id: string | null }[])
      .map((r) => r.activity_id)
      .filter((x): x is string => Boolean(x)),
  )
}

// 行為保留：未登入 → '尚未登入'；查詢失敗或查無 → '找不到使用者資料'（與原本一致）。
const savedProfileError = (kind: ProfileResolveKind) =>
  new SavedError(kind === 'unauthorized' ? '尚未登入' : '找不到使用者資料')

/** 收藏一個活動（重複收藏視為成功，靠 UNIQUE 去重）。 */
export async function saveActivity(
  supabase: SupabaseClient,
  args: { activityId: string },
): Promise<void> {
  const profileId = await resolveProfileId(supabase, savedProfileError)
  const { error } = await supabase
    .from('saved_activities')
    .upsert(
      { user_profile_id: profileId, activity_id: args.activityId },
      { onConflict: 'user_profile_id,activity_id', ignoreDuplicates: true },
    )
  if (error) throw new SavedError('收藏失敗，請稍後再試')
}

/** 取消收藏。 */
export async function unsaveActivity(
  supabase: SupabaseClient,
  args: { activityId: string },
): Promise<void> {
  const profileId = await resolveProfileId(supabase, savedProfileError)
  const { error } = await supabase
    .from('saved_activities')
    .delete()
    .eq('user_profile_id', profileId)
    .eq('activity_id', args.activityId)
  if (error) throw new SavedError('取消收藏失敗，請稍後再試')
}
