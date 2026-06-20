import type { SupabaseClient } from '@supabase/supabase-js'

// 交接小卡持久化：把「孩子現況濃縮卡」存進 handoff_summaries，之後家庭成員可回看。
// household_id / created_by 由 childId 與當前使用者推出（不信任前端），RLS 僅本家庭成員可讀寫。
// 跨平台共用：Web 與行動端各自帶 session 的 client。

export class HandoffError extends Error {}

export interface HandoffSummary {
  id: string
  summaryText: string | null
  logsReferenced: string[]
  createdAt: string | null
}

export interface HandoffRow {
  id: string
  summary_text: string | null
  logs_referenced: string[] | null
  created_at: string | null
}

/** DB 列 → HandoffSummary。抽出以便單元測試。 */
export function mapHandoffRow(row: HandoffRow): HandoffSummary {
  return {
    id: row.id,
    summaryText: row.summary_text,
    logsReferenced: row.logs_referenced || [],
    createdAt: row.created_at,
  }
}

/** 儲存一張交接小卡，回傳新建 id。household_id/created_by 由 DB 推出，不信任前端。 */
export async function saveHandoff(
  supabase: SupabaseClient,
  args: { childId: string; summaryText: string; logsReferenced?: string[] },
): Promise<string> {
  const { childId, summaryText, logsReferenced = [] } = args

  const { data: child, error: childError } = await supabase
    .from('child_profiles')
    .select('household_id')
    .eq('id', childId)
    .single()
  if (childError || !child?.household_id) throw new HandoffError('找不到孩子資料')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new HandoffError('尚未登入')

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (profileError || !profile) throw new HandoffError('找不到使用者資料')

  const { data, error } = await supabase
    .from('handoff_summaries')
    .insert({
      household_id: child.household_id,
      child_id: childId,
      created_by: profile.id,
      summary_text: summaryText,
      logs_referenced: logsReferenced,
    })
    .select('id')
    .single()
  if (error || !data) throw new HandoffError('儲存失敗，請稍後再試')
  return data.id as string
}

/** 列出某孩子近期已儲存的交接小卡（新到舊）。 */
export async function fetchHandoffs(
  supabase: SupabaseClient,
  childId: string,
): Promise<HandoffSummary[]> {
  const { data, error } = await supabase
    .from('handoff_summaries')
    .select('id,summary_text,logs_referenced,created_at')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new HandoffError('無法載入交接紀錄')
  return ((data || []) as HandoffRow[]).map(mapHandoffRow)
}
