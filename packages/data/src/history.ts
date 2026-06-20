import type { SupabaseClient } from '@supabase/supabase-js'

// 跨平台共用：陪伴歷史查詢。

export interface HistoryEntry {
  id: string
  title: string
  outcome: string | null
  reaction: string | null
  durationSecs: number | null
  createdAt: string | null
}

export class HistoryError extends Error {}

// companion_activities 關聯在 supabase-js 可能回物件或陣列，統一取第一筆的 title。
type ActivityJoin = { title: string } | { title: string }[] | null | undefined
function titleFrom(join: ActivityJoin): string {
  if (!join) return '自由陪伴'
  const obj = Array.isArray(join) ? join[0] : join
  return obj?.title || '自由陪伴'
}

export interface LogRow {
  id: string
  outcome: string | null
  child_reaction: string | null
  duration_secs: number | null
  created_at: string | null
  companion_activities: ActivityJoin
}

/** DB 列 → HistoryEntry。抽出以便單元測試（含關聯標題的物件/陣列兩種形狀）。 */
export function mapLogRow(row: LogRow): HistoryEntry {
  return {
    id: row.id,
    title: titleFrom(row.companion_activities),
    outcome: row.outcome,
    reaction: row.child_reaction,
    durationSecs: row.duration_secs,
    createdAt: row.created_at,
  }
}

/** 取近 50 筆陪伴紀錄（新到舊）。失敗丟 HistoryError。 */
export async function fetchHistory(
  supabase: SupabaseClient,
  childId: string,
): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from('companion_logs')
    .select('id,outcome,child_reaction,duration_secs,created_at,companion_activities(title)')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new HistoryError('無法載入陪伴紀錄')
  return ((data || []) as LogRow[]).map(mapLogRow)
}
