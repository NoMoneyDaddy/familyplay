import type { SupabaseClient } from '@supabase/supabase-js'

// 活動詳情（怎麼玩）：開場白、步驟、延伸問題、結尾、安全提醒。雙平台共用。

export class ActivityError extends Error {}

export interface ActivityDetail {
  id: string
  title: string
  openingLine: string | null
  steps: string[]
  followUpQuestions: string[]
  endingLine: string | null
  minDurationMinutes: number | null
  maxDurationMinutes: number | null
  safetyNotes: string | null
  developmentalFocus: string[]
  zpdTargets: string[] // 能力 key（camelCase），畫面端用 assessment 標籤映射成中文
}

export interface ActivityDetailRow {
  id: string
  title: string
  opening_line: string | null
  steps: unknown
  follow_up_questions: unknown
  ending_line: string | null
  min_duration_minutes: number | null
  max_duration_minutes: number | null
  safety_notes: string | null
  developmental_focus: string[] | null
  zpd_targets: string[] | null
}

// jsonb 欄位防呆：只取字串元素（與 Web 詳情頁一致的假設）。
function toStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

/** DB 列 → ActivityDetail。抽出以便單元測試。 */
export function mapActivityDetailRow(row: ActivityDetailRow): ActivityDetail {
  return {
    id: row.id,
    title: row.title,
    openingLine: row.opening_line,
    steps: toStringArray(row.steps),
    followUpQuestions: toStringArray(row.follow_up_questions),
    endingLine: row.ending_line,
    minDurationMinutes: row.min_duration_minutes,
    maxDurationMinutes: row.max_duration_minutes,
    safetyNotes: row.safety_notes,
    developmentalFocus: row.developmental_focus || [],
    zpdTargets: row.zpd_targets || [],
  }
}

const ACTIVITY_DETAIL_SELECT =
  'id,title,opening_line,steps,follow_up_questions,ending_line,min_duration_minutes,max_duration_minutes,safety_notes,developmental_focus,zpd_targets'

/** 取得單一活動詳情；查無回 null，DB 錯誤丟 ActivityError。 */
export async function fetchActivity(
  supabase: SupabaseClient,
  args: { activityId: string },
): Promise<ActivityDetail | null> {
  const { data, error } = await supabase
    .from('companion_activities')
    .select(ACTIVITY_DETAIL_SELECT)
    .eq('id', args.activityId)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw new ActivityError('無法載入活動詳情')
  if (!data) return null
  return mapActivityDetailRow(data as ActivityDetailRow)
}
